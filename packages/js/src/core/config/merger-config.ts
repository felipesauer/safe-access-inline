/**
 * Configuration for the {@link deepMerge} utility.
 */
export interface MergerConfig {
    /** Maximum recursion depth allowed when merging nested objects. */
    readonly maxDepth: number;
}

/** Sensible defaults for {@link MergerConfig}. */
export const DEFAULT_MERGER_CONFIG: MergerConfig = {
    maxDepth: 512,
};
