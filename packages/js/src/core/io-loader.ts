import * as fs from 'node:fs';
import * as fsp from 'node:fs/promises';
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

    // DNS-level SSRF check: resolve hostname, verify it's not private, and get the resolved IP
    const parsed = new URL(url);
    const resolvedIp = await resolveAndValidateIp(parsed.hostname, {
        allowPrivateIps: options?.allowPrivateIps,
    });

    emitAudit('url.fetch', { url });

    const response = await fetch(url, {
        redirect: 'error', // block all redirects — prevents SSRF via open redirects
        signal: AbortSignal.timeout(10_000), // 10 s timeout — prevents DoS via slow servers
    });

    // Post-fetch DNS rebinding guard: re-validate that the hostname still resolves
    // to non-private IPs. If an attacker switched DNS to a private IP between the
    // pre-fetch validation and the actual connection, this second check catches it.
    if (resolvedIp) {
        await resolveAndValidateIp(parsed.hostname, {
            allowPrivateIps: options?.allowPrivateIps,
        });
    }

    if (!response.ok) {
        throw new SecurityError(`Failed to fetch URL '${url}': HTTP ${response.status}`);
    }
    return response.text();
}
