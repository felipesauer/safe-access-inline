/**
 * Configuration for the parsed-path LRU cache ({@link PathCache}).
 */
export interface CacheConfig {
    /** Maximum number of parsed paths to retain. Oldest entries are evicted first. */
    readonly maxSize: number;
}

/** Sensible defaults for {@link CacheConfig}. */
export const DEFAULT_CACHE_CONFIG: CacheConfig = {
    maxSize: 1000,
};
