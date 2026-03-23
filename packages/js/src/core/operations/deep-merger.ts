import { SecurityGuard } from '../../security/guards/security-guard';
import { DEFAULT_MERGER_CONFIG } from '../config/merger-config';

const MAX_MERGE_DEPTH = DEFAULT_MERGER_CONFIG.maxDepth;

/**
 * Returns `true` when `val` is a plain object whose own enumerable keys are
 * all consecutive non-negative integer strings (`"0"`, `"1"`, `"2"`, …).
 *
 * This mirrors PHP's `array_is_list()`: a plain object like `{ 0: 'a', 1: 'b' }`
 * is treated as a list — it should be **replaced**, not deep-merged, in the
 * same way a sequential PHP array would be.
 *
 * @param val - Plain object to inspect (must not be an Array).
 * @returns `true` when all keys are sequential integer strings starting at `"0"`.
 */
function isObjectList(val: Record<string, unknown>): boolean {
    const keys = Object.keys(val);
    return keys.length === 0 || keys.every((k, i) => k === String(i));
}

/**
 * Recursively validates string keys of objects nested inside array structures,
 * preventing prototype-pollution injection through nested object keys.
 *
 * Mirrors PHP's `DeepMerger::sanitizeArray()` which runs `assertSafeKey` on
 * every string key encountered while traversing list arrays.
 *
 * @param items - Array to validate recursively.
 * @throws {SecurityError} When a forbidden key is detected at any depth.
 */
function sanitizeArray(items: unknown[]): void {
    for (const item of items) {
        if (Array.isArray(item)) {
            sanitizeArray(item);
        } else if (item !== null && typeof item === 'object') {
            for (const k of Object.keys(item as Record<string, unknown>)) {
                SecurityGuard.assertSafeKey(k);
            }
            for (const nested of Object.values(item as Record<string, unknown>)) {
                if (Array.isArray(nested)) {
                    sanitizeArray(nested as unknown[]);
                }
            }
        }
    }
}

/**
 * Deep merge utility for layered configuration.
 *
 * Plain associative objects are merged recursively (last source wins for
 * conflicting keys). Primitives, JS arrays, and object-lists (plain objects
 * whose keys are all consecutive integer strings, equivalent to PHP's
 * `array_is_list()`) are replaced wholesale — not merged element-by-element.
 *
 * @param base - Base object to merge into.
 * @param overrides - One or more source objects applied in order (last wins).
 * @returns A new deeply-merged object; neither `base` nor any override is mutated.
 * @throws {Error} When merge depth exceeds the configured maximum.
 */
export function deepMerge(
    base: Record<string, unknown>,
    ...overrides: Record<string, unknown>[]
): Record<string, unknown> {
    let result = structuredClone(base);

    for (const override of overrides) {
        result = mergeTwo(result, override, 0);
    }

    return result;
}

/**
 * Recursively merges `source` into `target` up to the configured maximum depth.
 *
 * Merge strategy (mirrors PHP `DeepMerger::mergeTwo()`):
 * - **Associative objects** (plain, non-list): merged recursively.
 * - **JS arrays** or **object-lists** (keys `"0"`, `"1"`, ...): replaced
 *   wholesale after running sanitizeArray to block prototype-pollution
 *   in nested structures.
 * - **Primitives / null**: replaced as-is.
 *
 * Prototype-pollution on the source object's own keys is prevented by asserting
 * every key through SecurityGuard.assertSafeKey.
 *
 * @param target - Working clone of the destination object.
 * @param source - Source object whose values override `target`.
 * @param depth  - Current recursion depth (tracked to enforce the depth limit).
 * @returns The mutated `target` object.
 * @throws {Error} When `depth` exceeds `MAX_MERGE_DEPTH`.
 */
function mergeTwo(
    target: Record<string, unknown>,
    source: Record<string, unknown>,
    depth: number,
): Record<string, unknown> {
    if (depth > MAX_MERGE_DEPTH) {
        throw new Error(`Deep merge exceeded maximum depth of ${MAX_MERGE_DEPTH}`);
    }
    // target is already a fresh clone owned by the caller — mutate in place
    for (const key of Object.keys(source)) {
        // Prevent prototype-pollution during deep merge (OWASP A03:2021 — Injection)
        SecurityGuard.assertSafeKey(key);
        const srcVal = source[key];
        const tgtVal = target[key];

        const srcIsAssociative =
            typeof srcVal === 'object' &&
            srcVal !== null &&
            !Array.isArray(srcVal) &&
            !isObjectList(srcVal as Record<string, unknown>);

        const tgtIsAssociative =
            typeof tgtVal === 'object' &&
            tgtVal !== null &&
            !Array.isArray(tgtVal) &&
            !isObjectList(tgtVal as Record<string, unknown>);

        if (srcIsAssociative && tgtIsAssociative) {
            target[key] = mergeTwo(
                tgtVal as Record<string, unknown>,
                srcVal as Record<string, unknown>,
                depth + 1,
            );
        } else {
            // Replace wholesale; for array/list-shaped values also sanitize
            // nested object keys to prevent prototype-pollution injection.
            if (typeof srcVal === 'object' && srcVal !== null) {
                const cloned = structuredClone(srcVal) as unknown;
                if (Array.isArray(cloned)) {
                    sanitizeArray(cloned as unknown[]);
                } else if (isObjectList(cloned as Record<string, unknown>)) {
                    sanitizeArray(Object.values(cloned as Record<string, unknown>) as unknown[]);
                }
                target[key] = cloned;
            } else {
                target[key] = srcVal;
            }
        }
    }

    return target;
}
