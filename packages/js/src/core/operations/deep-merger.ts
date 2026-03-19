import { SecurityGuard } from '../../security/guards/security-guard';
import { DEFAULT_MERGER_CONFIG } from '../config/merger-config';

const MAX_MERGE_DEPTH = DEFAULT_MERGER_CONFIG.maxDepth;

/**
 * Deep merge utility for layered configuration.
 * Objects are merged recursively. Primitives and arrays are replaced by last source.
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
