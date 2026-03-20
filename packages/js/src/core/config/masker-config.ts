/**
 * Configuration options for the {@link mask} data-masking function.
 */
export interface MaskerConfig {
    /** Replacement value used for redacted fields. */
    readonly defaultMaskValue: string;
    /** Maximum nesting depth before masking stops recursing. */
    readonly maxRecursionDepth: number;
    /**
     * Maximum number of compiled wildcard regex patterns to keep in the LRU cache.
     *
     * Because mask patterns can be user-supplied via {@link SecurityPolicy.maskPatterns},
     * an unbounded cache would allow an adversary to cause unbounded heap growth by
     * submitting many distinct patterns in a multi-request or multi-tenant context.
     */
    readonly maxPatternCacheSize: number;
}

/** Sensible defaults for {@link MaskerConfig}. */
export const DEFAULT_MASKER_CONFIG: MaskerConfig = Object.freeze({
    defaultMaskValue: '[REDACTED]',
    maxRecursionDepth: 100,
    maxPatternCacheSize: 200,
});
