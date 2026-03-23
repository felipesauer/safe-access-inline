import * as fs from 'node:fs';
import * as fsp from 'node:fs/promises';
import * as https from 'node:https';
import * as path from 'node:path';
import { SecurityError } from '../../exceptions/security.error';
import { assertSafeUrl, resolveAndValidateIp } from '../../security/sanitizers/ip-range-checker';
import { Format } from '../../enums/format.enum';
import { emitAudit, AuditEventType } from '../../security/audit/audit-emitter';
import { DEFAULT_SECURITY_OPTIONS } from '../../security/guards/security-options';
import { type IoLoaderConfig, DEFAULT_IO_LOADER_CONFIG } from '../config/io-loader-config';

let ioConfig: IoLoaderConfig = DEFAULT_IO_LOADER_CONFIG;

/**
 * Overrides the default I/O loader configuration (request timeouts, etc.).
 *
 * @param overrides - Partial config; unspecified keys retain their defaults.
 */
export function configureIoLoader(overrides: Partial<IoLoaderConfig>): void {
    ioConfig = { ...DEFAULT_IO_LOADER_CONFIG, ...overrides };
}

/**
 * Resets the I/O loader configuration to defaults.
 */
export function resetIoLoaderConfig(): void {
    ioConfig = DEFAULT_IO_LOADER_CONFIG;
}

/**
 * Maps file extensions to Format enum values.
 */
const EXTENSION_FORMAT_MAP: Record<string, Format> = {
    '.json': Format.Json,
    '.xml': Format.Xml,
    '.yaml': Format.Yaml,
    '.yml': Format.Yaml,
    '.toml': Format.Toml,
    '.ini': Format.Ini,
    '.cfg': Format.Ini,
    '.csv': Format.Csv,
    '.env': Format.Env,
    '.ndjson': Format.Ndjson,
    '.jsonl': Format.Ndjson,
};

/**
 * Detects the {@link Format} for `filePath` based on its file extension.
 *
 * @param filePath - File path or URL path whose extension is inspected.
 * @returns The matching {@link Format} enum value, or `null` when unrecognised.
 */
export function resolveFormatFromExtension(filePath: string): Format | null {
    const ext = path.extname(filePath).toLowerCase();
    return EXTENSION_FORMAT_MAP[ext] ?? null;
}

/**
 * Validates that `filePath` is inside one of the `allowedDirs`.
 *
 * Resolves symlinks, blocks null-byte injection, and rejects paths outside the allowlist.
 *
 * Returns the canonical resolved path so the caller can use it directly for subsequent
 * I/O operations, eliminating the TOCTOU window between path validation and the actual
 * file read/write.
 *
 * @param filePath - Path to validate.
 * @param allowedDirs - Allowlisted directory roots.
 * @param options - Optional flags; `allowAnyPath: true` bypasses directory restrictions.
 * @returns The canonical resolved path.
 * @throws {@link SecurityError} When the path violates any constraint.
 */
export function assertPathWithinAllowedDirs(
    filePath: string,
    allowedDirs?: string[],
    options?: { allowAnyPath?: boolean },
): string {
    // Block null bytes
    if (filePath.includes('\0')) {
        throw new SecurityError('File path contains null bytes.');
    }

    if (!allowedDirs || allowedDirs.length === 0) {
        if (options?.allowAnyPath) {
            // No directory restriction — resolve the path best-effort and return the canonical form.
            try {
                return fs.realpathSync(filePath);
            } catch {
                return path.resolve(filePath);
            }
        }
        throw new SecurityError(
            'No allowedDirs configured. Provide allowedDirs or set allowAnyPath: true to bypass path restrictions.',
        );
    }

    // Resolve symlinks before comparing — path.resolve() alone does not follow symlinks.
    // The returned canonical path is used by readFileSync/readFile to close TOCTOU windows.
    let resolved: string;
    try {
        resolved = fs.realpathSync(filePath);
    } catch {
        // File does not exist yet (e.g. a write target) — fall back to logical resolution
        resolved = path.resolve(filePath);
    }

    const allowed = allowedDirs.some((dir) => {
        let resolvedDir: string;
        try {
            resolvedDir = fs.realpathSync(dir);
        } catch {
            resolvedDir = path.resolve(dir);
        }
        return resolved.startsWith(resolvedDir + path.sep) || resolved === resolvedDir;
    });

    if (!allowed) {
        throw new SecurityError(`Path '${filePath}' is outside allowed directories.`);
    }

    return resolved;
}

/**
 * Synchronously reads a file after verifying it is within `allowedDirs`.
 *
 * @throws {@link SecurityError} When path validation fails.
 */
export function readFileSync(
    filePath: string,
    options?: { allowedDirs?: string[]; allowAnyPath?: boolean },
): string {
    // Use the canonical resolved path for I/O to close the TOCTOU window between
    // symlink validation and the actual read (the path could be swapped between the two).
    const resolved = assertPathWithinAllowedDirs(filePath, options?.allowedDirs, {
        allowAnyPath: options?.allowAnyPath,
    });
    emitAudit(AuditEventType.FILE_READ, { filePath });
    return fs.readFileSync(resolved, 'utf-8');
}

/**
 * Asynchronously reads a file after verifying it is within `allowedDirs`.
 *
 * @throws {@link SecurityError} When path validation fails.
 */
export async function readFile(
    filePath: string,
    options?: { allowedDirs?: string[]; allowAnyPath?: boolean },
): Promise<string> {
    // Use the canonical resolved path for I/O to close the TOCTOU window between
    // symlink validation and the actual read (the path could be swapped between the two).
    const resolved = assertPathWithinAllowedDirs(filePath, options?.allowedDirs, {
        allowAnyPath: options?.allowAnyPath,
    });
    emitAudit(AuditEventType.FILE_READ, { filePath });
    return fsp.readFile(resolved, 'utf-8');
}

/**
 * Fetches a remote URL over HTTPS with full SSRF protection.
 *
 * Validates the URL, resolves DNS, pins the connection to the pre-validated IP,
 * blocks redirects, and enforces payload-size limits.
 *
 * When `ioConfig.httpClient` is set, the custom client is used for the actual
 * HTTP request (SSRF validation and DNS pinning are still performed first).
 * When `ioConfig.dnsResolver` is set, DNS lookups use the injected resolver.
 *
 * @throws {@link SecurityError} On any policy violation or connection failure.
 */
export async function fetchUrl(
    url: string,
    options?: {
        allowPrivateIps?: boolean;
        allowedHosts?: string[];
        allowedPorts?: number[];
        /** Maximum allowed response body size in bytes. Defaults to {@link DEFAULT_SECURITY_OPTIONS.maxPayloadBytes}. */
        maxPayloadBytes?: number;
    },
): Promise<string> {
    assertSafeUrl(url, options);

    const parsed = new URL(url);

    // Resolve and validate the IP before connecting — prevents SSRF via private/internal hosts.
    const resolvedIp = await resolveAndValidateIp(parsed.hostname, {
        allowPrivateIps: options?.allowPrivateIps,
        dnsResolver: ioConfig.dnsResolver,
    });

    emitAudit(AuditEventType.URL_FETCH, { url });

    // Use injected HTTP client if configured (tests, proxies, custom TLS, etc.).
    // SSRF validation above is always applied regardless of which client handles the request.
    if (ioConfig.httpClient) {
        const resp = await ioConfig.httpClient.fetch(url, {
            timeout: ioConfig.requestTimeoutMs,
        });
        if (!resp.ok) {
            throw new SecurityError(`Failed to fetch URL '${url}': HTTP ${resp.status}`);
        }
        const body = await resp.text();
        const maxBytes = options?.maxPayloadBytes ?? DEFAULT_SECURITY_OPTIONS.maxPayloadBytes;
        if (Buffer.byteLength(body, 'utf-8') > maxBytes) {
            throw new SecurityError(`Response body exceeds maximum size of ${maxBytes} bytes.`);
        }
        return body;
    }

    // Pin the pre-validated IP to the HTTPS connection to prevent DNS rebinding (TOCTOU).
    // native fetch() performs its own independent DNS lookup after our security check, opening
    // a race window. Using https.request() with a custom lookup overrides the resolver,
    // equivalent to PHP's CURLOPT_RESOLVE option in IoLoader::fetchUrl().
    // resolvedIp is null when allowPrivateIps=true (testing/internal use) OR when no IPv4
    // address could be resolved (e.g. IPv6-only hostnames). Only pin when a resolved IP is available.
    const isIPv6 = resolvedIp !== null && resolvedIp.includes(':');

    return new Promise<string>((resolve, reject) => {
        const req = https.request(
            {
                hostname: parsed.hostname,
                port: Number(parsed.port) || 443,
                path: parsed.pathname + parsed.search,
                method: 'GET',
                timeout: ioConfig.requestTimeoutMs,
                // Override DNS resolution to use the pre-validated IP (when available)
                lookup:
                    resolvedIp !== null
                        ? (_h, _o, cb) => cb(null, resolvedIp, isIPv6 ? 6 : 4)
                        : undefined,
            },
            (res) => {
                // Block redirects — prevents SSRF via open-redirect chains
                if ((res.statusCode ?? 0) >= 300) {
                    res.resume(); // drain to avoid memory leak
                    reject(
                        new SecurityError(`Failed to fetch URL '${url}': HTTP ${res.statusCode}`),
                    );
                    return;
                }
                const maxBytes =
                    options?.maxPayloadBytes ?? DEFAULT_SECURITY_OPTIONS.maxPayloadBytes;
                let body = '';
                let received = 0;
                res.setEncoding('utf-8');
                res.on('data', (chunk: string) => {
                    received += Buffer.byteLength(chunk, 'utf-8');
                    if (received > maxBytes) {
                        req.destroy();
                        reject(
                            new SecurityError(
                                `Response body exceeds maximum size of ${maxBytes} bytes.`,
                            ),
                        );
                        return;
                    }
                    body += chunk;
                });
                res.on('end', () => resolve(body));
            },
        );
        req.on('socket', (socket) => {
            socket.setTimeout(ioConfig.connectTimeoutMs);
            socket.once('connect', () => socket.setTimeout(0));
            socket.once('timeout', () => {
                req.destroy();
                reject(
                    new SecurityError(
                        `Connection to '${url}' timed out after ${ioConfig.connectTimeoutMs}ms.`,
                    ),
                );
            });
        });
        req.on('error', reject);
        req.on('timeout', () => {
            req.destroy();
            reject(
                new SecurityError(
                    `Request to '${url}' timed out after ${ioConfig.requestTimeoutMs}ms.`,
                ),
            );
        });
        req.end();
    });
}
