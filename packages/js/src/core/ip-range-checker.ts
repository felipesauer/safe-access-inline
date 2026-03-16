import { SecurityError } from '../exceptions/security.error';
import { emitAudit } from './audit-emitter';

const PRIVATE_IP_RANGES = [
    // 10.0.0.0/8
    { start: 0x0a000000, end: 0x0affffff },
    // 172.16.0.0/12
    { start: 0xac100000, end: 0xac1fffff },
    // 192.168.0.0/16
    { start: 0xc0a80000, end: 0xc0a8ffff },
    // 127.0.0.0/8
    { start: 0x7f000000, end: 0x7fffffff },
    // 169.254.0.0/16 (link-local, AWS metadata)
    { start: 0xa9fe0000, end: 0xa9feffff },
    // 0.0.0.0/8
    { start: 0x00000000, end: 0x00ffffff },
];

export function ipToLong(ip: string): number {
    const parts = ip.split('.').map(Number);
    if (parts.length !== 4 || parts.some((p) => isNaN(p) || p < 0 || p > 255)) return -1;
    return ((parts[0] << 24) | (parts[1] << 16) | (parts[2] << 8) | parts[3]) >>> 0;
}

export function isPrivateIp(ip: string): boolean {
    const long = ipToLong(ip);
    if (long === -1) return true; // invalid = treat as private for safety
    return PRIVATE_IP_RANGES.some((range) => long >= range.start && long <= range.end);
}

export function isIpv6Loopback(host: string): boolean {
    const cleaned = host.replace(/^\[|\]$/g, '');
    // Loopback: ::1
    if (cleaned === '::1' || cleaned === '0:0:0:0:0:0:0:1') return true;

    // ULA: fc00::/7 — first byte is 0xfc or 0xfd (private ranges)
    if (/^f[cd][0-9a-f]{0,2}:/i.test(cleaned)) return true;

    // Link-local: fe80::/10 — equivalent to 169.254.x.x (cloud metadata)
    if (/^fe[89ab][0-9a-f]{0,1}:/i.test(cleaned)) return true;

    return false;
}

export function assertSafeUrl(
    url: string,
    options?: { allowPrivateIps?: boolean; allowedHosts?: string[]; allowedPorts?: number[] },
): void {
    let parsed: URL;
    try {
        parsed = new URL(url);
    } catch {
        throw new SecurityError(`Invalid URL: '${url}'`);
    }

    if (parsed.protocol !== 'https:') {
        throw new SecurityError(
            `Only HTTPS URLs are allowed. Got: '${parsed.protocol.replace(':', '')}'`,
        );
    }

    if (parsed.username || parsed.password) {
        throw new SecurityError('URLs with embedded credentials are not allowed.');
    }

    const allowedPorts = options?.allowedPorts ?? [443];
    const port = parsed.port ? Number(parsed.port) : 443;
    if (!allowedPorts.includes(port)) {
        throw new SecurityError(
            `Port ${port} is not in the allowed list: [${allowedPorts.join(', ')}]`,
        );
    }

    if (options?.allowedHosts && options.allowedHosts.length > 0) {
        if (!options.allowedHosts.includes(parsed.hostname)) {
            throw new SecurityError(`Host '${parsed.hostname}' is not in the allowed list.`);
        }
    }

    if (!options?.allowPrivateIps) {
        const hostname = parsed.hostname;

        if (isIpv6Loopback(hostname)) {
            throw new SecurityError('Access to loopback IPv6 addresses is blocked.');
        }

        // Check ::ffff: IPv4-mapped IPv6 addresses
        const cleanedHost = hostname.replace(/^\[|\]$/g, '');
        if (cleanedHost.toLowerCase().startsWith('::ffff:')) {
            const mappedPart = cleanedHost.substring(7);
            // URL parser may normalize to hex pairs (e.g., ::ffff:808:808 for 8.8.8.8)
            let mappedIp: string;
            const hexMatch = mappedPart.match(/^([0-9a-f]{1,4}):([0-9a-f]{1,4})$/i);
            if (hexMatch) {
                const hi = parseInt(hexMatch[1], 16);
                const lo = parseInt(hexMatch[2], 16);
                mappedIp = `${(hi >> 8) & 0xff}.${hi & 0xff}.${(lo >> 8) & 0xff}.${lo & 0xff}`;
            } else {
                mappedIp = mappedPart;
            }
            if (isPrivateIp(mappedIp)) {
                throw new SecurityError(
                    `Access to private/internal IP '${cleanedHost}' is blocked (SSRF protection).`,
                );
            }
        }

        // Check raw IP
        if (/^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(hostname)) {
            if (isPrivateIp(hostname)) {
                throw new SecurityError(
                    `Access to private/internal IP '${hostname}' is blocked (SSRF protection).`,
                );
            }
        }

        // Block well-known metadata hostnames
        if (hostname === 'metadata.google.internal' || hostname === 'instance-data') {
            throw new SecurityError(`Access to cloud metadata hostname '${hostname}' is blocked.`);
        }
    }
}

/**
 * Resolves a hostname to an IP address via DNS and checks if it's private.
 * Must be called in async context (e.g. fetchUrl) to catch hostname-based SSRF.
 */
export async function assertResolvedIpNotPrivate(
    hostname: string,
    options?: { allowPrivateIps?: boolean },
): Promise<void> {
    if (options?.allowPrivateIps) return;

    // Skip if already a raw IP (already checked synchronously)
    if (/^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(hostname)) return;

    const { resolve4 } = await import('node:dns/promises');
    try {
        const addresses = await resolve4(hostname);
        for (const ip of addresses) {
            if (isPrivateIp(ip)) {
                emitAudit('security.violation', { reason: 'ssrf_dns_resolution', hostname, ip });
                throw new SecurityError(
                    `Host '${hostname}' resolves to private IP '${ip}' (SSRF protection).`,
                );
            }
        }
    } catch (err) {
        if (err instanceof SecurityError) throw err;
        // DNS resolution failure — allow to proceed (fetch will fail anyway)
    }
}
