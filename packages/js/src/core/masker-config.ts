/**
 * Configuration options for the {@link mask} data-masking function.
 */
export interface MaskerConfig {
    /** Replacement value used for redacted fields. */
    readonly defaultMaskValue: string;
    /** Maximum nesting depth before masking stops recursing. */
    readonly maxRecursionDepth: number;
}

/** Sensible defaults for {@link MaskerConfig}. */
export const DEFAULT_MASKER_CONFIG: MaskerConfig = {
    defaultMaskValue: '[REDACTED]',
    maxRecursionDepth: 100,
};
