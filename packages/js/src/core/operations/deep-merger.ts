import { SecurityGuard } from '../../security/guards/security-guard';
import { DEFAULT_MERGER_CONFIG } from '../config/merger-config';

const MAX_MERGE_DEPTH = DEFAULT_MERGER_CONFIG.maxDepth;

/**
 * Deep merge utility for layered configuration.
 *
 * Objects are merged recursively (last source wins for conflicting keys).
 * Primitives and arrays are replaced wholesale — not merged element-by-element.
 *
 * @param base - Base object to merge into.
 * @param overrides - One or more source objects applied in order (last wins).
 * @returns A new deeply-merged object; neither `base` nor any override is mutated.
 * @throws {@link Error} When merge depth exceeds the configured maximum.
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
 * Prototype-pollution is prevented by asserting every key through {@link SecurityGuard.assertSafeKey}.
 * `target` must already be a caller-owned clone — it is mutated in place.
 *
 * @param target - Working clone of the destination object.
 * @param source - Source object whose values override `target`.
 * @param depth - Current recursion depth (tracked to enforce the depth limit).
 * @returns The mutated `target` object.
 * @throws {@link Error} When `depth` exceeds `MAX_MERGE_DEPTH`.
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

        if (
            typeof srcVal === 'object' &&
            srcVal !== null &&
            !Array.isArray(srcVal) &&
            typeof tgtVal === 'object' &&
            tgtVal !== null &&
            !Array.isArray(tgtVal)
        ) {
            target[key] = mergeTwo(
                tgtVal as Record<string, unknown>,
                srcVal as Record<string, unknown>,
                depth + 1,
            );
        } else {
            // Only deep-clone objects/arrays; primitives are immutable and need no cloning
            target[key] =
                typeof srcVal === 'object' && srcVal !== null ? structuredClone(srcVal) : srcVal;
        }
    }

    return target;
}
