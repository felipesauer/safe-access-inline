import { type CacheConfig, DEFAULT_CACHE_CONFIG } from '../config/cache-config';

type Segment = { type: string; [key: string]: unknown };

/**
 * LRU cache for parsed dot-notation path segments.
 *
 * Backed by a `Map` whose insertion order provides O(1) eviction of the
 * oldest entry when the cache exceeds {@link CacheConfig.maxSize}.
 */
export class PathCache {
    private static config: CacheConfig = DEFAULT_CACHE_CONFIG;
    private static readonly cache = new Map<string, Segment[]>();
    private static enabled = true;

    /** Overrides cache configuration (e.g. `maxSize`). */
    static configure(config: Partial<CacheConfig>): void {
        PathCache.config = { ...DEFAULT_CACHE_CONFIG, ...config };
    }

    /** Returns cached segments for `path`, promoting the entry to most-recently-used. */
    static get(path: string): Segment[] | undefined {
        if (!PathCache.enabled) return undefined;
        const cached = PathCache.cache.get(path);
        if (cached !== undefined) {
            // Promote to most-recently-used by reinserting
            PathCache.cache.delete(path);
            PathCache.cache.set(path, cached);
        }
        return cached;
    }

    /** Stores `segments` for `path`, evicting the oldest entry if the cache is full. */
    static set(path: string, segments: Segment[]): void {
        if (!PathCache.enabled) return;
        if (PathCache.cache.size >= PathCache.config.maxSize) {
            // Evict oldest (first) entry
            const firstKey = PathCache.cache.keys().next().value;
            PathCache.cache.delete(firstKey!);
        }
        PathCache.cache.set(path, segments);
    }

    /** Returns `true` if the cache contains an entry for `path`. */
    static has(path: string): boolean {
        return PathCache.cache.has(path);
    }

    /** Removes all cached entries and re-enables the cache if previously disabled. */
    static clear(): void {
        PathCache.cache.clear();
        PathCache.enabled = true; // restore default after clear — prevents permanent disable after resetAll()
    }

    /** Current number of cached entries. */
    static get size(): number {
        return PathCache.cache.size;
    }

    /** Disables caching — subsequent `get()` calls always return `undefined`. */
    static disable(): void {
        PathCache.enabled = false;
    }

    /** Re-enables caching after a previous {@link disable} call. */
    static enable(): void {
        PathCache.enabled = true;
    }

    /** Whether the cache is currently active. */
    static get isEnabled(): boolean {
        return PathCache.enabled;
    }
}
