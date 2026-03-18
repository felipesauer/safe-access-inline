import { SecurityGuard } from './security-guard';

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
        result = mergeTwo(result, override);
    }

    return result;
}

function mergeTwo(
    target: Record<string, unknown>,
    source: Record<string, unknown>,
): Record<string, unknown> {
    const result = structuredClone(target);

    for (const key of Object.keys(source)) {
        SecurityGuard.assertSafeKey(key);
        const srcVal = source[key];
        const tgtVal = result[key];

        if (
            typeof srcVal === 'object' &&
            srcVal !== null &&
            !Array.isArray(srcVal) &&
            typeof tgtVal === 'object' &&
            tgtVal !== null &&
            !Array.isArray(tgtVal)
        ) {
            result[key] = mergeTwo(
                tgtVal as Record<string, unknown>,
                srcVal as Record<string, unknown>,
            );
        } else {
            // Only deep-clone objects/arrays; primitives are immutable and need no cloning
            result[key] =
                typeof srcVal === 'object' && srcVal !== null ? structuredClone(srcVal) : srcVal;
        }
    }

    return result;
}
