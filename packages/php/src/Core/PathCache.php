<?php

declare(strict_types=1);

namespace SafeAccessInline\Core;

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
    private static CacheConfig $config;

    private static function config(): CacheConfig
    {
        return self::$config ??= new CacheConfig();
    }

    public static function configure(CacheConfig $config): void
    {
        self::$config = $config;
    }

    /** @var array<string, array<mixed>> */
    private static array $cache = [];

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

    public static function has(string $path): bool
    {
        return isset(self::$cache[$path]);
    }

    public static function clear(): void
    {
        self::$cache = [];
        self::$enabled = true; // restore default after clear — prevents permanent disable after resetAll()
    }

    public static function size(): int
    {
        return count(self::$cache);
    }

    public static function disable(): void
    {
        self::$enabled = false;
    }

    public static function enable(): void
    {
        self::$enabled = true;
    }

    public static function isEnabled(): bool
    {
        return self::$enabled;
    }
}
