import { SecurityError } from '../exceptions/security.error';
import { emitAudit } from './audit-emitter';

const FORBIDDEN_KEYS = new Set(['__proto__', 'constructor', 'prototype']);

export class SecurityGuard {
    static assertSafeKey(key: string): void {
        if (FORBIDDEN_KEYS.has(key)) {
            emitAudit('security.violation', { reason: 'forbidden_key', key });
            throw new SecurityError(
                `Forbidden key '${key}' detected. This key is blocked to prevent prototype pollution.`,
            );
        }
    }

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
