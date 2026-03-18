import * as fs from 'node:fs';
import * as fsp from 'node:fs/promises';
import * as https from 'node:https';
import * as path from 'node:path';
import { SecurityError } from '../exceptions/security.error';
import { assertSafeUrl, resolveAndValidateIp } from './ip-range-checker';
import { Format } from '../format.enum';
import { emitAudit } from './audit-emitter';

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

export function resolveFormatFromExtension(filePath: string): Format | null {
    const ext = path.extname(filePath).toLowerCase();
    return EXTENSION_FORMAT_MAP[ext] ?? null;
}

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
                path: (parsed.pathname || '/') + parsed.search,
                method: 'GET',
                timeout: 10_000,
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
                let body = '';
                res.setEncoding('utf-8');
                res.on('data', (chunk: string) => (body += chunk));
                res.on('end', () => resolve(body));
            },
        );
        req.on('error', reject);
        req.on('timeout', () => {
            req.destroy();
            reject(new SecurityError(`Request to '${url}' timed out after 10s.`));
        });
        req.end();
    });
}
