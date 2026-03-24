<?php

declare(strict_types=1);

namespace SafeAccessInline\Core\Parsers;

use SafeAccessInline\Core\Config\ParserConfig;
use SafeAccessInline\Core\Resolvers\PathCache;
use SafeAccessInline\Core\Resolvers\PathResolver;
use SafeAccessInline\Enums\SegmentType;
use SafeAccessInline\Exceptions\SecurityException;
use SafeAccessInline\Security\Guards\SecurityGuard;

/**
 * Core engine for resolving paths with dot notation.
 *
 * Parsing is delegated to {@see SegmentParser}; recursive traversal
 * is handled by {@see PathResolver}. This class provides the public
 * CRUD API over dot-notation paths.
 *
 * Features:
 *   - Nested access:            "user.profile.name"
 *   - Numeric indices:          "items.0.title"
 *   - Bracket notation:         "matrix[0][1]" → converted to "matrix.0.1"
 *   - Wildcard:                 "users.*.name" → returns array of values
 *   - Escaped literal dot:      "config\.db.host" → key "config.db", sub-key "host"
 *
 * All operations are pure (no side-effects) and static.
 *
 * @internal Implementation detail. Do not rely on this in application code.
 */
final class DotNotationParser
{
    /** Active parser configuration, lazily initialised on first access. */
    private static ParserConfig $config;

    /**
     * Returns the active parser configuration, lazily initialised.
     */
    private static function config(): ParserConfig
    {
        return self::$config ??= new ParserConfig();
    }

    /**
     * Overrides the default parser configuration.
     *
     * @param ParserConfig $config New configuration to apply.
     */
    public static function configure(ParserConfig $config): void
    {
        self::$config = $config;
    }

    /**
     * Resets the parser configuration to its default values.
     *
     * Convenience method equivalent to `configure(new ParserConfig())`.
     * Useful in test teardown to restore a clean state.
     *
     * **JS alignment:** mirrors `DotNotationParser.resetConfig()` in the JS package.
     *
     * @see configure()
     */
    public static function resetConfig(): void
    {
        self::$config = new ParserConfig();
    }

    /**
     * Accesses a value in a nested structure.
     *
     * @param array<mixed> $data Normalized data structure
     * @param string $path Dot notation path
     * @param mixed $default Default value if path does not exist
     * @return mixed
     */
    public static function get(array $data, string $path, mixed $default = null): mixed
    {
        if ($path === '') {
            return $default;
        }

        $segments = self::cachedParseSegments($path);
        return PathResolver::resolve($data, $segments, 0, $default, self::config()->maxResolveDepth);
    }

    /**
     * Returns cached segments for `$path`, parsing and caching them on first call.
     *
     * @return list<array{type: SegmentType::DESCENT, key: string}|array{type: SegmentType::DESCENT_MULTI, keys: non-empty-list<string>}|array{type: SegmentType::FILTER, expression: array{conditions: array<array{field: string, operator: string, value: mixed}>, logicals: array<string>}}|array{type: SegmentType::KEY, value: string}|array{type: SegmentType::MULTI_INDEX, indices: non-empty-list<int>}|array{type: SegmentType::MULTI_KEY, keys: non-empty-list<string>}|array{type: SegmentType::PROJECTION, fields: list<array{alias: string, source: string}>}|array{type: SegmentType::SLICE, start: int|null, end: int|null, step: int|null}|array{type: SegmentType::WILDCARD}>
     */
    private static function cachedParseSegments(string $path): array
    {
        $cached = PathCache::get($path);
        if ($cached !== null) {
            /** @var list<array{type: SegmentType::DESCENT, key: string}|array{type: SegmentType::DESCENT_MULTI, keys: non-empty-list<string>}|array{type: SegmentType::FILTER, expression: array{conditions: array<array{field: string, operator: string, value: mixed}>, logicals: array<string>}}|array{type: SegmentType::KEY, value: string}|array{type: SegmentType::MULTI_INDEX, indices: non-empty-list<int>}|array{type: SegmentType::MULTI_KEY, keys: non-empty-list<string>}|array{type: SegmentType::PROJECTION, fields: list<array{alias: string, source: string}>}|array{type: SegmentType::SLICE, start: int|null, end: int|null, step: int|null}|array{type: SegmentType::WILDCARD}> $cached */
            return $cached;
        }
        $segments = SegmentParser::parseSegments($path);
        PathCache::set($path, $segments);
        return $segments;
    }

    /**
     * Returns the parsed and cached segments for `$path`.
     *
     * @param  string             $path Dot-notation path to parse.
     * @return list<array<mixed>> Parsed path segments (retrieved from or stored in cache).
     */
    public static function getSegments(string $path): array
    {
        return self::cachedParseSegments($path);
    }

    /**
     * Resolves pre-parsed segments against `$data` using the active configuration.
     *
     * Used by {@see \SafeAccessInline\Core\AbstractAccessor::getCompiled()} to bypass
     * path tokenization on repeated calls.
     *
     * @param  array<mixed>       $data     Root data structure.
     * @param  list<array<mixed>> $segments Pre-parsed path segments.
     * @param  mixed              $default  Fallback when the path does not exist.
     * @return mixed              The resolved value, or `$default`.
     */
    public static function resolve(array $data, array $segments, mixed $default = null): mixed
    {
        /** @var array<array{type: SegmentType|string, value?: string, key?: string, expression?: array<mixed>, indices?: array<int>, keys?: array<string>, fields?: list<array{alias: string, source: string}>, start?: int|null, end?: int|null, step?: int|null}> $segments */
        return PathResolver::resolve($data, $segments, 0, $default, self::config()->maxResolveDepth);
    }

    /**
     * Checks whether a path exists (using a sentinel object).
     *
     * @param array<mixed> $data
     * @param string $path
     * @return bool
     */
    public static function has(array $data, string $path): bool
    {
        $sentinel = new \stdClass();
        return self::get($data, $path, $sentinel) !== $sentinel;
    }

    /**
     * Sets a value via dot notation. Returns a NEW array (immutable).
     *
     * Uses explicit shallow-copy traversal at every intermediate level so that
     * PHP's COW (copy-on-write) reference sharing is broken before any write
     * occurs. This mirrors JavaScript's `{ ...obj }` spread at each level and
     * ensures the caller's original array is never mutated.
     *
     * @param array<mixed> $data
     * @param string $path
     * @param mixed $value
     * @return array<mixed>
     */
    public static function set(array $data, string $path, mixed $value): array
    {
        $keys = SegmentParser::parseKeys($path);
        return self::setAtKeys($data, $keys, 0, $value);
    }

    /**
     * Recursive helper for {@see set()}: copies one level at a time and recurses.
     *
     * @param array<mixed>  $data
     * @param string[]      $keys
     * @param int           $idx
     * @param mixed         $value
     * @return array<mixed>
     */
    private static function setAtKeys(array $data, array $keys, int $idx, mixed $value): array
    {
        // Explicit element-by-element copy to break any PHP `&reference` sharing
        // inherited from the caller's structure — equivalent to `{ ...data }` in JS.
        $result = [];
        foreach ($data as $k => $v) {
            $result[$k] = $v;
        }

        $key = $keys[$idx];
        SecurityGuard::assertSafeKey($key);

        if ($idx === count($keys) - 1) {
            $result[$key] = $value;
        } else {
            $nested = isset($result[$key]) && is_array($result[$key]) ? $result[$key] : [];
            $result[$key] = self::setAtKeys($nested, $keys, $idx + 1, $value);
        }

        return $result;
    }

    /**
     * Deep merges a value at a path. Returns a NEW array (immutable).
     * Objects/arrays are merged recursively; scalar values are replaced.
     *
     * @param array<mixed> $data
     * @param string $path Empty string merges at root
     * @param array<mixed> $value Data to merge
     * @return array<mixed>
     */
    public static function merge(array $data, string $path, array $value): array
    {
        $existing = $path !== '' ? self::get($data, $path, []) : $data;
        $merged = self::deepMerge(
            is_array($existing) ? $existing : [],
            $value
        );
        return $path !== '' ? self::set($data, $path, $merged) : $merged;
    }

    /**
     * Recursively merges source into target. Associative arrays are merged; other values replaced.
     *
     * Result is always a fresh array — PHP references (`&$var`) inside `$target` are
     * broken at each recursion level by iterating over the target with a foreach,
     * mirroring JavaScript's `{ ...target }` spread operator which also performs a
     * shallow, reference-breaking copy before applying overrides.
     *
     * @param array<mixed> $target
     * @param array<mixed> $source
     * @return array<mixed>
     */
    private static function deepMerge(array $target, array $source, int $depth = 0): array
    {
        if ($depth > self::config()->maxResolveDepth) {
            throw new SecurityException('Deep merge exceeded maximum depth of ' . self::config()->maxResolveDepth);
        }

        // Explicit foreach copy instead of $result = $target so that PHP references
        // (&$var) stored in $target are NOT carried over into $result.
        // This matches JS's `{ ...target }` spread: always a fresh structure at this level.
        $result = [];
        foreach ($target as $k => $v) {
            $result[$k] = $v;
        }

        foreach ($source as $key => $srcVal) {
            if (is_string($key)) {
                SecurityGuard::assertSafeKey($key);
            }
            if (
                is_array($srcVal)
                && !array_is_list($srcVal)
                && isset($result[$key])
                && is_array($result[$key])
                && !array_is_list($result[$key])
            ) {
                $result[$key] = self::deepMerge($result[$key], $srcVal, $depth + 1);
            } else {
                $result[$key] = $srcVal;
            }
        }
        return $result;
    }

    /**
     * Removes a path via dot notation. Returns a NEW array (immutable).
     *
     * Uses explicit shallow-copy traversal to avoid mutating intermediate nodes
     * shared with the caller's original array.
     *
     * @param array<mixed> $data
     * @param string $path
     * @return array<mixed>
     */
    public static function remove(array $data, string $path): array
    {
        $keys = SegmentParser::parseKeys($path);
        if (count($keys) === 0) {
            return $data;
        }
        return self::removeAtKeys($data, $keys, 0);
    }

    /**
     * Recursive helper for {@see remove()}: copies one level at a time and recurses.
     *
     * @param array<mixed> $data
     * @param string[]     $keys
     * @param int          $idx
     * @return array<mixed>
     */
    private static function removeAtKeys(array $data, array $keys, int $idx): array
    {
        // Explicit element-by-element copy to break PHP reference sharing.
        $result = [];
        foreach ($data as $k => $v) {
            $result[$k] = $v;
        }

        $key = $keys[$idx];

        if ($idx === count($keys) - 1) {
            unset($result[$key]);
        } else {
            if (!isset($result[$key]) || !is_array($result[$key])) {
                return $result;
            }
            $result[$key] = self::removeAtKeys($result[$key], $keys, $idx + 1);
        }

        return $result;
    }

    /**
     * Literal segment navigation — no wildcards, no filters, no descent.
     *
     * @param array<mixed> $data
     * @param string[] $segments
     */
    public static function getBySegments(array $data, array $segments, mixed $default = null): mixed
    {
        $current = $data;
        foreach ($segments as $segment) {
            if (!is_array($current) || !array_key_exists($segment, $current)) {
                return $default;
            }
            $current = $current[$segment];
        }
        return $current;
    }

    /**
     * Sets a value at a pre-parsed string segment array. Returns a NEW array (immutable).
     *
     * Uses explicit shallow-copy traversal at every intermediate level to break PHP
     * reference sharing — same guarantee as {@see set()}.
     *
     * @param array<mixed> $data
     * @param string[] $segments
     * @return array<mixed>
     */
    public static function setBySegments(array $data, array $segments, mixed $value): array
    {
        $n = count($segments);
        if ($n === 0) {
            return $data;
        }
        return self::setAtSegments($data, $segments, 0, $value);
    }

    /**
     * Recursive helper for {@see setBySegments()}.
     *
     * @param array<mixed> $data
     * @param string[]     $segments
     * @param int          $idx
     * @param mixed        $value
     * @return array<mixed>
     */
    private static function setAtSegments(array $data, array $segments, int $idx, mixed $value): array
    {
        // Explicit element-by-element copy to break PHP reference sharing.
        $result = [];
        foreach ($data as $k => $v) {
            $result[$k] = $v;
        }

        $seg = $segments[$idx];
        SecurityGuard::assertSafeKey($seg);

        if ($idx === count($segments) - 1) {
            $result[$seg] = $value;
        } else {
            $nested = isset($result[$seg]) && is_array($result[$seg]) ? $result[$seg] : [];
            $result[$seg] = self::setAtSegments($nested, $segments, $idx + 1, $value);
        }

        return $result;
    }

    /**
     * Removes the value at a pre-parsed string segment array. Returns a NEW array (immutable).
     *
     * Uses explicit shallow-copy traversal to avoid mutating the caller's structure.
     *
     * @param array<mixed> $data
     * @param string[] $segments
     * @return array<mixed>
     */
    public static function removeBySegments(array $data, array $segments): array
    {
        $n = count($segments);
        if ($n === 0) {
            return $data;
        }
        return self::removeAtSegments($data, $segments, 0);
    }

    /**
     * Recursive helper for {@see removeBySegments()}.
     *
     * @param array<mixed> $data
     * @param string[]     $segments
     * @param int          $idx
     * @return array<mixed>
     */
    private static function removeAtSegments(array $data, array $segments, int $idx): array
    {
        // Explicit element-by-element copy to break PHP reference sharing.
        $result = [];
        foreach ($data as $k => $v) {
            $result[$k] = $v;
        }

        $seg = $segments[$idx];

        if ($idx === count($segments) - 1) {
            unset($result[$seg]);
        } else {
            if (!isset($result[$seg]) || !is_array($result[$seg])) {
                return $result;
            }
            $result[$seg] = self::removeAtSegments($result[$seg], $segments, $idx + 1);
        }

        return $result;
    }

}
