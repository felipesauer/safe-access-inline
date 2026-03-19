import { SecurityError } from '../exceptions/security.error';

const _utf8Encoder = new TextEncoder();

/** Runtime security limits applied to parsing and traversal operations. */
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

/**
 * Throws if the UTF-8 byte length of `input` exceeds the allowed maximum.
 *
 * @param input - Raw string payload.
 * @param maxBytes - Override for the default limit.
 * @throws {@link SecurityError} When the payload exceeds the limit.
 */
export function assertPayloadSize(input: string, maxBytes?: number): void {
    const limit = maxBytes ?? DEFAULT_SECURITY_OPTIONS.maxPayloadBytes;
    const size = _utf8Encoder.encode(input).length;
    if (size > limit) {
        throw new SecurityError(`Payload size ${size} bytes exceeds maximum of ${limit} bytes.`);
    }
}

/**
 * Throws if the total recursive key count in `data` exceeds the allowed maximum.
 *
 * @param data - The top-level object to count keys in.
 * @param maxKeys - Override for the default limit.
 * @throws {@link SecurityError} When the key count exceeds the limit.
 */
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

/**
 * Throws if `currentDepth` exceeds the configured maximum recursion depth.
 *
 * @param currentDepth - The current nesting level.
 * @param maxDepth - Override for the default limit.
 * @throws {@link SecurityError} When depth exceeds the limit.
 */
export function assertMaxDepth(currentDepth: number, maxDepth?: number): void {
    const limit = maxDepth ?? DEFAULT_SECURITY_OPTIONS.maxDepth;
    if (currentDepth > limit) {
        throw new SecurityError(`Recursion depth ${currentDepth} exceeds maximum of ${limit}.`);
    }
}

/**
 * Measures the structural depth of `data` and throws if it exceeds `maxDepth`.
 *
 * Cycle-safe — uses a `WeakSet` to avoid infinite loops on circular references.
 *
 * @param data - The value to measure.
 * @param maxDepth - Maximum allowed depth.
 * @throws {@link SecurityError} When the structural depth exceeds the limit.
 */
export function assertMaxStructuralDepth(data: unknown, maxDepth: number): void {
    const depth = measureDepth(data, new WeakSet(), 0);
    if (depth > maxDepth) {
        throw new SecurityError(
            `Data structural depth ${depth} exceeds policy maximum of ${maxDepth}.`,
        );
    }
}

function measureDepth(value: unknown, seen: WeakSet<object>, current: number): number {
    if (typeof value !== 'object' || value === null) return current;
    if (seen.has(value)) return current;
    seen.add(value);

    let max = current;
    const entries = Array.isArray(value) ? value : Object.values(value);
    for (const child of entries) {
        const d = measureDepth(child, seen, current + 1);
        if (d > max) max = d;
    }
    return max;
}
