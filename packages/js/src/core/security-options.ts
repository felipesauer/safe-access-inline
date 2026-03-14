import { SecurityError } from '../exceptions/security.error';

export interface SecurityOptions {
    maxDepth?: number;
    maxPayloadBytes?: number;
    maxKeys?: number;
}

export const DEFAULT_SECURITY_OPTIONS: Required<SecurityOptions> = {
    maxDepth: 512,
    maxPayloadBytes: 10 * 1024 * 1024, // 10MB
    maxKeys: 10_000,
};

export function assertPayloadSize(input: string, maxBytes?: number): void {
    const limit = maxBytes ?? DEFAULT_SECURITY_OPTIONS.maxPayloadBytes;
    const size = new TextEncoder().encode(input).length;
    if (size > limit) {
        throw new SecurityError(`Payload size ${size} bytes exceeds maximum of ${limit} bytes.`);
    }
}

export function assertMaxKeys(data: Record<string, unknown>, maxKeys?: number): void {
    const limit = maxKeys ?? DEFAULT_SECURITY_OPTIONS.maxKeys;
    const count = countKeys(data);
    if (count > limit) {
        throw new SecurityError(`Data contains ${count} keys, exceeding maximum of ${limit}.`);
    }
}

function countKeys(obj: unknown, depth = 0): number {
    if (depth > 100) return 0; // prevent infinite recursion in counting
    if (typeof obj !== 'object' || obj === null) return 0;
    let count = 0;
    const entries = Array.isArray(obj) ? obj : Object.values(obj);
    count += Array.isArray(obj) ? obj.length : Object.keys(obj).length;
    for (const value of entries) {
        count += countKeys(value, depth + 1);
    }
    return count;
}

export function assertMaxDepth(currentDepth: number, maxDepth?: number): void {
    const limit = maxDepth ?? DEFAULT_SECURITY_OPTIONS.maxDepth;
    if (currentDepth > limit) {
        throw new SecurityError(`Recursion depth ${currentDepth} exceeds maximum of ${limit}.`);
    }
}
