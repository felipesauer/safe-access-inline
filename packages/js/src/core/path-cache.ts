type Segment = { type: string; [key: string]: unknown };

const MAX_CACHE_SIZE = 1000;

export class PathCache {
    private static readonly cache = new Map<string, Segment[]>();
    private static enabled = true;

    static get(path: string): Segment[] | undefined {
        if (!PathCache.enabled) return undefined;
        return PathCache.cache.get(path);
    }

    static set(path: string, segments: Segment[]): void {
        if (!PathCache.enabled) return;
        if (PathCache.cache.size >= MAX_CACHE_SIZE) {
            // Evict oldest (first) entry
            const firstKey = PathCache.cache.keys().next().value;
            PathCache.cache.delete(firstKey!);
        }
        PathCache.cache.set(path, segments);
    }

    static has(path: string): boolean {
        return PathCache.cache.has(path);
    }

    static clear(): void {
        PathCache.cache.clear();
    }

    static get size(): number {
        return PathCache.cache.size;
    }

    static disable(): void {
        PathCache.enabled = false;
    }

    static enable(): void {
        PathCache.enabled = true;
    }

    static get isEnabled(): boolean {
        return PathCache.enabled;
    }
}
