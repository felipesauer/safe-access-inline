import { SecurityError } from '../../exceptions/security.error';
import { emitAudit } from '../audit/audit-emitter';

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

/**
 * Converts a dotted-decimal IPv4 string to an unsigned 32-bit integer.
 *
 * @param ip - IPv4 address (e.g. `'192.168.1.1'`).
 * @returns The numeric representation, or `-1` if the address is malformed.
 */
export function ipToLong(ip: string): number {
    const parts = ip.split('.').map(Number);
    if (parts.length !== 4 || parts.some((p) => isNaN(p) || p < 0 || p > 255)) return -1;
    return ((parts[0] << 24) | (parts[1] << 16) | (parts[2] << 8) | parts[3]) >>> 0;
}

/**
 * Checks whether an IPv4 address falls within an RFC 1918 / link-local / loopback range.
 *
 * Malformed addresses are treated as private for safety.
 *
 * @param ip - Dotted-decimal IPv4 address.
 * @returns `true` if the address is private or invalid.
 */
export function isPrivateIp(ip: string): boolean {
    const long = ipToLong(ip);
    if (long === -1) return true; // invalid = treat as private for safety
    return PRIVATE_IP_RANGES.some((range) => long >= range.start && long <= range.end);
}

/**
 * Checks whether a host string is an IPv6 loopback, ULA, or link-local address.
 *
 * @param host - Raw hostname or bracket-wrapped IPv6 literal.
 * @returns `true` if the address matches a private IPv6 range.
 */
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

/**
 * Validates a URL against SSRF-prevention rules.
 *
 * Enforces HTTPS-only, rejects embedded credentials, validates the port
 * against an allowlist, and blocks private/loopback IPs and cloud-metadata hostnames.
 *
 * @param url - The URL to validate.
 * @param options - Optional overrides for IP, host, and port restrictions.
 * @throws {@link SecurityError} If any rule is violated.
 */
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
            // Node's URL parser normalizes ::ffff: mapped addresses to hex pairs
            // (e.g., ::ffff:127.0.0.1 → ::ffff:7f00:1), so we always parse hex.
            const hexMatch = mappedPart.match(/^([0-9a-f]{1,4}):([0-9a-f]{1,4})$/i);
            /* v8 ignore next 5 — defensive: WHATWG URL spec (§4.1) normalises IPv4-mapped
               IPv6 addresses to hex pairs (e.g. ::ffff:127.0.0.1 → ::ffff:7f00:1).
               The hexMatch RegExp covers all normalised forms; this branch guards
               against hypothetical future parser changes. */
            if (!hexMatch) {
                throw new SecurityError(
                    `Access to IPv4-mapped IPv6 address '${cleanedHost}' is blocked (SSRF protection).`,
                );
            }
            const mappedIp = `${(parseInt(hexMatch[1], 16) >> 8) & 0xff}.${parseInt(hexMatch[1], 16) & 0xff}.${(parseInt(hexMatch[2], 16) >> 8) & 0xff}.${parseInt(hexMatch[2], 16) & 0xff}`;
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
        if (
            hostname === 'metadata.google.internal' ||
            hostname === 'instance-data' ||
            hostname === 'metadata.oracle.internal'
        ) {
            throw new SecurityError(`Access to cloud metadata hostname '${hostname}' is blocked.`);
        }
    }
}

/**
 * Resolves a hostname to IPv4, validates it is not a private IP, and returns
 * the resolved address for connection pinning. Returns null when skipped.
 * @internal Not part of the public API — used by fetchUrl for DNS pinning.
 */
export async function resolveAndValidateIp(
    hostname: string,
    options?: { allowPrivateIps?: boolean },
): Promise<string | null> {
    if (options?.allowPrivateIps) return null;

    // Already a raw IPv4 — return directly (already checked synchronously by assertSafeUrl)
    if (/^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(hostname)) return hostname;

    const dns = await import('node:dns/promises');
    try {
        // Check IPv4 (A records)
        const v4Addresses = await dns.resolve4(hostname).catch(() => [] as string[]);
        for (const ip of v4Addresses) {
            if (isPrivateIp(ip)) {
                emitAudit('security.violation', { reason: 'ssrf_dns_resolution', hostname, ip });
                throw new SecurityError(
                    `Host '${hostname}' resolves to private IP '${ip}' (SSRF protection).`,
                );
            }
        }

        // Check IPv6 (AAAA records) — prevents bypass via AAAA-only hostnames
        const v6Addresses = await dns.resolve6(hostname).catch(() => [] as string[]);
        for (const ip of v6Addresses) {
            if (isIpv6Loopback(ip)) {
                emitAudit('security.violation', { reason: 'ssrf_dns_resolution', hostname, ip });
                throw new SecurityError(
                    `Host '${hostname}' resolves to private IPv6 '${ip}' (SSRF protection).`,
                );
            }
        }

        return v4Addresses[0] ?? null;
        /* v8 ignore start — defensive: the per-record .catch(() => []) handlers above absorb
           expected DNS errors (ENOTFOUND, ENODATA). This outer catch only fires for truly
           unexpected failures (e.g. OS-level or runtime errors). SecurityErrors are rethrown.
           Testable via vi.spyOn(dns.promises, 'resolve4') throwing a non-DNS error. */
    } catch (err) {
        if (err instanceof SecurityError) throw err;
        return null;
    }
    /* v8 ignore stop */
}

/**
 * Resolves a hostname to an IP address via DNS and checks if it's private.
 * Must be called in async context (e.g. fetchUrl) to catch hostname-based SSRF.
 */
export async function assertResolvedIpNotPrivate(
    hostname: string,
    options?: { allowPrivateIps?: boolean },
): Promise<void> {
    await resolveAndValidateIp(hostname, options);
}
