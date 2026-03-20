import { SecurityError } from '../../exceptions/security.error';

const _utf8Encoder = new TextEncoder();

/** Runtime security limits applied to parsing and traversal operations. */
export interface SecurityOptions {
    maxDepth?: number;
    maxPayloadBytes?: number;
    maxKeys?: number;
    /**
     * Maximum recursion depth used when counting keys via {@link assertMaxKeys}.
     *
     * Prevents runaway recursion on deeply nested payloads. Deliberately lower
     * than {@link maxDepth} because key-counting is a secondary guard — structural
     * depth is enforced separately via {@link assertMaxDepth}.
     */
    maxCountDepth?: number;
}

export const DEFAULT_SECURITY_OPTIONS: Required<SecurityOptions> = {
    maxDepth: 512,
    maxPayloadBytes: 10 * 1024 * 1024, // 10MB
    maxKeys: 10_000,
    maxCountDepth: 100,
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

/**
 * Recursively counts all keys in `obj`, including nested objects and arrays.
 *
 * Hard-stops at {@link DEFAULT_SECURITY_OPTIONS.maxCountDepth} to prevent runaway
 * recursion on deeply nested data. This limit is intentionally lower than
 * {@link DEFAULT_SECURITY_OPTIONS.maxDepth} — structural depth is enforced
 * separately via {@link assertMaxDepth}.
 *
 * @param obj - Value to count keys within.
 * @param depth - Current recursion depth (used internally).
 * @returns Total number of keys / elements found.
 */
function countKeys(obj: unknown, depth = 0): number {
    if (depth > DEFAULT_SECURITY_OPTIONS.maxCountDepth) return 0; // prevent runaway recursion
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

/**
 * Recursively measures the maximum structural depth of `value`.
 *
 * Cycle-safe — `seen` tracks visited objects to avoid infinite loops.
 *
 * @param value - Value to measure.
 * @param seen - WeakSet of already-visited objects.
 * @param current - Current depth level.
 * @returns Maximum nesting depth reachable from `value`.
 */
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
