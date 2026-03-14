import { emitAudit } from './audit-emitter';

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

export type MaskPattern = string | RegExp;
const REDACTED = '[REDACTED]';

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
    const regex = new RegExp(
        '^' + pattern.replace(/[.*+?^${}()|[\]\\]/g, (m) => (m === '*' ? '.*' : '\\' + m)) + '$',
    );
    return regex.test(text);
}

function maskRecursive(obj: Record<string, unknown>, patterns: MaskPattern[], depth: number): void {
    if (depth > 100) return;
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
