import * as fs from 'node:fs';
import * as fsp from 'node:fs/promises';
import * as https from 'node:https';
import * as path from 'node:path';
import { SecurityError } from '../../exceptions/security.error';
import { assertSafeUrl, resolveAndValidateIp } from '../../security/sanitizers/ip-range-checker';
import { Format } from '../../enums/format.enum';
import { emitAudit } from '../../security/audit/audit-emitter';
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
 * @throws {@link SecurityError} When the path violates any constraint.
 */
export function assertPathWithinAllowedDirs(
    filePath: string,
    allowedDirs?: string[],
    options?: { allowAnyPath?: boolean },
): void {
    // Block null bytes
    if (filePath.includes('\0')) {
        throw new SecurityError('File path contains null bytes.');
    }

    if (!allowedDirs || allowedDirs.length === 0) {
        if (options?.allowAnyPath) {
            return;
        }
        throw new SecurityError(
            'No allowedDirs configured. Provide allowedDirs or set allowAnyPath: true to bypass path restrictions.',
        );
    }

    // Resolve symlinks before comparing — path.resolve() alone does not follow symlinks
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
    assertPathWithinAllowedDirs(filePath, options?.allowedDirs, {
        allowAnyPath: options?.allowAnyPath,
    });
    emitAudit('file.read', { filePath });
    return fs.readFileSync(filePath, 'utf-8');
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
    assertPathWithinAllowedDirs(filePath, options?.allowedDirs, {
        allowAnyPath: options?.allowAnyPath,
    });
    emitAudit('file.read', { filePath });
    return fsp.readFile(filePath, 'utf-8');
}

/**
 * Fetches a remote URL over HTTPS with full SSRF protection.
 *
 * Validates the URL, resolves DNS, pins the connection to the pre-validated IP,
 * blocks redirects, and enforces payload-size limits.
 *
 * @throws {@link SecurityError} On any policy violation or connection failure.
 */
export async function fetchUrl(
    url: string,
    options?: {
        allowPrivateIps?: boolean;
        allowedHosts?: string[];
        allowedPorts?: number[];
    },
): Promise<string> {
    assertSafeUrl(url, options);

    const parsed = new URL(url);

    // Resolve and validate the IP before connecting — prevents SSRF via private/internal hosts.
    const resolvedIp = await resolveAndValidateIp(parsed.hostname, {
        allowPrivateIps: options?.allowPrivateIps,
    });

    emitAudit('url.fetch', { url });

    // Pin the pre-validated IP to the HTTPS connection to prevent DNS rebinding (TOCTOU).
    // native fetch() performs its own independent DNS lookup after our security check, opening
    // a race window. Using https.request() with a custom lookup overrides the resolver,
    // equivalent to PHP's CURLOPT_RESOLVE option in IoLoader::fetchUrl().
    // resolvedIp is null only when allowPrivateIps=true (testing/internal use); in that case
    // we let the OS resolve normally since there is no security constraint to enforce.
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
                const maxBytes = DEFAULT_SECURITY_OPTIONS.maxPayloadBytes;
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
