import { emitAudit } from './audit-emitter';
import { DEFAULT_MASKER_CONFIG } from '../core/masker-config';

/**
 * Common sensitive key names that are always masked, regardless of user-supplied patterns.
 * @see OWASP Sensitive Data Exposure (A02:2021 — Cryptographic Failures)
 * @see https://cheatsheetseries.owasp.org/cheatsheets/Logging_Cheat_Sheet.html
 */
const COMMON_SENSITIVE_KEYS = new Set([
    'password',
    'secret',
    'token',
    'api_key',
    'apikey',
    'private_key',
    'passphrase',
    'credential',
    'auth',
    'authorization',
    'cookie',
    'session',
    'ssn',
    'credit_card',
    'creditcard',
]);

/** A glob-style string or `RegExp` used to match sensitive keys for masking. */
export type MaskPattern = string | RegExp;
const REDACTED = DEFAULT_MASKER_CONFIG.defaultMaskValue;

/** Cache compiled RegExp objects for glob-style wildcard patterns to avoid recompilation per call. */
const wildcardRegexCache = new Map<string, RegExp>();

/**
 * Deep-clones `data` and replaces values of sensitive keys with a redaction placeholder.
 *
 * Keys in {@link COMMON_SENSITIVE_KEYS} are always masked. Additional keys can be
 * targeted via glob-style strings or `RegExp` patterns.
 *
 * @param data - The object to mask (not mutated).
 * @param patterns - Optional extra patterns to match key names against.
 * @returns A deep clone of `data` with matched values replaced by `[REDACTED]`.
 */
export function mask(
    data: Record<string, unknown>,
    patterns?: MaskPattern[],
): Record<string, unknown> {
    emitAudit('data.mask', { patternCount: patterns?.length ?? 0 });
    const result = structuredClone(data);
    maskRecursive(result, patterns ?? [], 0);
    return result;
}

function matchesPattern(key: string, patterns: MaskPattern[]): boolean {
    const lowerKey = key.toLowerCase();
    if (COMMON_SENSITIVE_KEYS.has(lowerKey)) return true;

    for (const pattern of patterns) {
        if (typeof pattern === 'string') {
            if (matchWildcard(lowerKey, pattern.toLowerCase())) return true;
        } else {
            if (pattern.test(key)) return true;
        }
    }
    return false;
}

function matchWildcard(text: string, pattern: string): boolean {
    if (pattern === '*') return true;
    if (!pattern.includes('*')) return text === pattern;
    let regex = wildcardRegexCache.get(pattern);
    if (!regex) {
        regex = new RegExp(
            '^' +
                pattern.replace(/[.*+?^${}()|[\]\\]/g, (m) => (m === '*' ? '.*' : '\\' + m)) +
                '$',
        );
        wildcardRegexCache.set(pattern, regex);
    }
    return regex.test(text);
}

function maskRecursive(obj: Record<string, unknown>, patterns: MaskPattern[], depth: number): void {
    if (depth > DEFAULT_MASKER_CONFIG.maxRecursionDepth) return;
    for (const key of Object.keys(obj)) {
        if (matchesPattern(key, patterns)) {
            obj[key] = REDACTED;
        } else if (typeof obj[key] === 'object' && obj[key] !== null && !Array.isArray(obj[key])) {
            maskRecursive(obj[key] as Record<string, unknown>, patterns, depth + 1);
        } else if (Array.isArray(obj[key])) {
            for (const item of obj[key] as unknown[]) {
                if (typeof item === 'object' && item !== null && !Array.isArray(item)) {
                    maskRecursive(item as Record<string, unknown>, patterns, depth + 1);
                }
            }
        }
    }
}
