import { AuditEventType, emitAudit } from '../audit/audit-emitter';
import { DEFAULT_MASKER_CONFIG } from '../../core/config/masker-config';

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

/**
 * LRU cache for compiled wildcard RegExp patterns.
 *
 * Bounded to {@link MaskerConfig.maxPatternCacheSize} entries to prevent memory
 * exhaustion when mask patterns originate from user-controlled input (e.g.
 * {@link SecurityPolicy.maskPatterns} in a multi-tenant context).
 * Oldest entries are evicted when the cache is full (insertion-order LRU).
 */
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
    emitAudit(AuditEventType.DATA_MASK, { patternCount: patterns?.length ?? 0 });
    const result = structuredClone(data);
    maskRecursive(result, patterns ?? [], 0);
    return result;
}

/**
 * Checks whether `key` matches any of the supplied mask patterns.
 *
 * Checks the built-in sensitive-key list first, then iterates over `patterns`
 * (string wildcards or regular expressions).
 *
 * @param key - The object key to test.
 * @param patterns - Array of mask patterns to check against.
 * @returns `true` if `key` should be redacted.
 */
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

/**
 * Tests whether `text` matches a wildcard `pattern` that may use `*` as a glob.
 *
 * Compiled regexes are cached per pattern to avoid repeated compilation.
 *
 * @param text - The lower-cased key string to test.
 * @param pattern - A lower-cased wildcard pattern (e.g. `'api_*'`).
 * @returns `true` if `text` matches `pattern`.
 */
function matchWildcard(text: string, pattern: string): boolean {
    if (pattern === '*') return true;
    if (!pattern.includes('*')) return text === pattern;
    let regex = wildcardRegexCache.get(pattern);
    if (!regex) {
        // Evict the oldest entry when the cache is at capacity (LRU via insertion order)
        if (wildcardRegexCache.size >= DEFAULT_MASKER_CONFIG.maxPatternCacheSize) {
            const oldest = wildcardRegexCache.keys().next().value;
            wildcardRegexCache.delete(oldest!);
        }
        regex = new RegExp(
            '^' +
                pattern.replace(/[.*+?^${}()|[\]\\]/g, (m) => (m === '*' ? '.*' : '\\' + m)) +
                '$',
        );
        wildcardRegexCache.set(pattern, regex);
    } else {
        // Promote to most-recently-used by reinserting
        wildcardRegexCache.delete(pattern);
        wildcardRegexCache.set(pattern, regex);
    }
    return regex.test(text);
}

/**
 * Recursively traverses `obj` in place, replacing matching keys with the redacted sentinel.
 *
 * Recurses into nested plain objects and arrays (one level per iteration).
 * Stops at the configured maximum recursion depth to prevent runaway traversal.
 *
 * @param obj - The object to mask (mutated in place on a prior clone).
 * @param patterns - Mask patterns to match against.
 * @param depth - Current recursion depth.
 */
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
