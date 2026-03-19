import { SecurityError } from '../../exceptions/security.error';
import { emitAudit } from '../audit/audit-emitter';

const FORBIDDEN_KEYS = new Set([
    '__proto__',
    'constructor',
    'prototype',
    '__defineGetter__',
    '__defineSetter__',
    '__lookupGetter__',
    '__lookupSetter__',
    'valueOf',
    'toString',
    'hasOwnProperty',
    'isPrototypeOf',
]);

/**
 * Static utility that blocks prototype-pollution vectors.
 *
 * Maintains a set of forbidden JavaScript keys (`__proto__`, `constructor`, etc.)
 * and provides assertion and sanitisation helpers used throughout the accessor layer.
 */
export class SecurityGuard {
    /**
     * Throws if `key` is a prototype-pollution vector.
     *
     * @param key - The property name to validate.
     * @throws {@link SecurityError} When the key is in the forbidden set.
     */
    static assertSafeKey(key: string): void {
        if (FORBIDDEN_KEYS.has(key)) {
            emitAudit('security.violation', { reason: 'forbidden_key', key });
            throw new SecurityError(
                `Forbidden key '${key}' detected. This key is blocked to prevent prototype pollution.`,
            );
        }
    }

    /**
     * Deep-clones an object, stripping any keys that could trigger prototype pollution.
     *
     * Arrays are traversed recursively; primitives and `null` pass through unchanged.
     *
     * @param obj - The value to sanitise.
     * @returns A sanitised deep clone.
     */
    static sanitizeObject(obj: unknown): unknown {
        if (obj === null || typeof obj !== 'object') return obj;
        if (Array.isArray(obj)) return obj.map((item) => SecurityGuard.sanitizeObject(item));

        const cleaned: Record<string, unknown> = {};
        for (const [key, value] of Object.entries(obj as Record<string, unknown>)) {
            if (FORBIDDEN_KEYS.has(key)) continue;
            cleaned[key] = SecurityGuard.sanitizeObject(value);
        }
        return cleaned;
    }
}
