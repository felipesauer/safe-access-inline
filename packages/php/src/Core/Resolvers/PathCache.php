<?php

declare(strict_types=1);

namespace SafeAccessInline\Core\Resolvers;

use SafeAccessInline\Core\Config\CacheConfig;

/**
 * LRU-style path resolution cache for DotNotationParser segments.
 *
 * **Long-running runtimes (Swoole, RoadRunner, FrankenPHP):** Static state persists
 * across requests. Call {@see PathCache::clear()} in your worker boot/reset hook
 * to prevent unbounded cache growth and stale entries between requests.
 *
 * @phpstan-type Segment array{type: string, value?: string, expression?: mixed, key?: string}
 */
final class PathCache
{
    /** Active cache configuration, lazily initialised on first access. */
    private static CacheConfig $config;

    /**
     * Returns the active cache configuration, lazily initialised.
     */
    private static function config(): CacheConfig
    {
        return self::$config ??= new CacheConfig();
    }

    /**
     * Overrides the default cache configuration.
     *
     * @param CacheConfig $config New configuration to apply.
     */
    public static function configure(CacheConfig $config): void
    {
        self::$config = $config;
    }

    /**
     * In-memory LRU cache keyed by dot-notation path string.
     *
     * @var array<string, array<mixed>>
     */
    private static array $cache = [];

    /** Whether the cache is currently active; false disables all reads and writes. */
    private static bool $enabled = true;

    /**
     * @return array<mixed>|null
     */
    public static function get(string $path): ?array
    {
        if (!self::$enabled) {
            return null;
        }
        if (isset(self::$cache[$path])) {
            // Promote to most-recently-used by reinserting
            $value = self::$cache[$path];
            unset(self::$cache[$path]);
            self::$cache[$path] = $value;
            return $value;
        }
        return null;
    }

    /**
     * @param array<mixed> $segments
     */
    public static function set(string $path, array $segments): void
    {
        if (!self::$enabled) {
            return;
        }
        if (count(self::$cache) >= self::config()->maxSize) {
            // Evict oldest entry
            reset(self::$cache);
            $firstKey = key(self::$cache);
            if ($firstKey !== null) {
                unset(self::$cache[$firstKey]);
            }
        }
        self::$cache[$path] = $segments;
    }

    /**
     * Returns whether the given path is currently cached.
     *
     * @param string $path Dot-notation path to check.
     * @return bool True if the path has a cached segment array.
     */
    public static function has(string $path): bool
    {
        return isset(self::$cache[$path]);
    }

    /**
     * Removes all cached entries and re-enables the cache.
     *
     * Call this in long-running runtimes (Swoole, RoadRunner) during request reset.
     */
    public static function clear(): void
    {
        self::$cache = [];
        self::$enabled = true; // restore default after clear — prevents permanent disable after resetAll()
    }

    /**
     * Returns the number of paths currently stored in the cache.
     *
     * @return int Current cache entry count.
     */
    public static function size(): int
    {
        return count(self::$cache);
    }

    /**
     * Disables all cache reads and writes.
     *
     * Useful when deterministic (non-cached) behaviour is required in tests.
     */
    public static function disable(): void
    {
        self::$enabled = false;
    }

    /**
     * Re-enables cache reads and writes after a previous {@see disable()} call.
     */
    public static function enable(): void
    {
        self::$enabled = true;
    }

    /**
     * Returns whether the cache is currently accepting reads and writes.
     *
     * @return bool True when the cache is active.
     */
    public static function isEnabled(): bool
    {
        return self::$enabled;
    }
}
