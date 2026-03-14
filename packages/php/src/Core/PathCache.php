<?php

namespace SafeAccessInline\Core;

/**
 * LRU-style path resolution cache for DotNotationParser segments.
 *
 * @phpstan-type Segment array{type: string, value?: string, expression?: mixed, key?: string}
 */
final class PathCache
{
    private const MAX_CACHE_SIZE = 1000;

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
        return self::$cache[$path] ?? null;
    }

    /**
     * @param array<mixed> $segments
     */
    public static function set(string $path, array $segments): void
    {
        if (!self::$enabled) {
            return;
        }
        if (count(self::$cache) >= self::MAX_CACHE_SIZE) {
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
