<?php

declare(strict_types=1);

namespace SafeAccessInline\Core\Parsers;

use SafeAccessInline\Core\Config\ParserConfig;
use SafeAccessInline\Core\Rendering\TemplateRenderer;
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
     * @return list<array{type: SegmentType::DESCENT, key: string}|array{type: SegmentType::DESCENT_MULTI, keys: non-empty-list<string>}|array{type: SegmentType::FILTER, expression: array{conditions: array<array{field: string, operator: string, value: mixed}>, logicals: array<string>}}|array{type: SegmentType::KEY, value: string}|array{type: SegmentType::MULTI_INDEX, indices: non-empty-list<int>}|array{type: SegmentType::MULTI_KEY, keys: non-empty-list<string>}|array{type: SegmentType::SLICE, start: int|null, end: int|null, step: int|null}|array{type: SegmentType::WILDCARD}>
     */
    private static function cachedParseSegments(string $path): array
    {
        $cached = PathCache::get($path);
        if ($cached !== null) {
            /** @var list<array{type: SegmentType::DESCENT, key: string}|array{type: SegmentType::DESCENT_MULTI, keys: non-empty-list<string>}|array{type: SegmentType::FILTER, expression: array{conditions: array<array{field: string, operator: string, value: mixed}>, logicals: array<string>}}|array{type: SegmentType::KEY, value: string}|array{type: SegmentType::MULTI_INDEX, indices: non-empty-list<int>}|array{type: SegmentType::MULTI_KEY, keys: non-empty-list<string>}|array{type: SegmentType::SLICE, start: int|null, end: int|null, step: int|null}|array{type: SegmentType::WILDCARD}> $cached */
            return $cached;
        }
        $segments = SegmentParser::parseSegments($path);
        PathCache::set($path, $segments);
        return $segments;
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
     * @param array<mixed> $data
     * @param string $path
     * @param mixed $value
     * @return array<mixed>
     */
    public static function set(array $data, string $path, mixed $value): array
    {
        $keys = SegmentParser::parseKeys($path);
        $result = $data;
        $current = &$result;

        foreach ($keys as $key) {
            SecurityGuard::assertSafeKey($key);
            if (!is_array($current)) {
                $current = [];
            }
            if (!array_key_exists($key, $current)) {
                $current[$key] = [];
            }
            $current = &$current[$key];
        }

        $current = $value;
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
     * @param array<mixed> $target
     * @param array<mixed> $source
     * @return array<mixed>
     */
    private static function deepMerge(array $target, array $source, int $depth = 0): array
    {
        if ($depth > self::config()->maxResolveDepth) {
            throw new SecurityException('Deep merge exceeded maximum depth of ' . self::config()->maxResolveDepth);
        }

        $result = $target;
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
     * @param array<mixed> $data
     * @param string $path
     * @return array<mixed>
     */
    public static function remove(array $data, string $path): array
    {
        $keys = SegmentParser::parseKeys($path);
        $result = $data;
        $current = &$result;

        $lastKey = array_pop($keys);
        assert($lastKey !== null, 'parseKeys() always returns a non-empty array');

        foreach ($keys as $key) {
            if (!is_array($current) || !array_key_exists($key, $current)) {
                return $result;
            }
            $current = &$current[$key];
        }

        if (is_array($current)) {
            unset($current[$lastKey]);
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
     * @param array<mixed> $data
     * @param string[] $segments
     * @return array<mixed>
     */
    public static function setBySegments(array $data, array $segments, mixed $value): array
    {
        $result = $data;
        $current = &$result;
        for ($i = 0; $i < count($segments) - 1; $i++) {
            $seg = $segments[$i];
            SecurityGuard::assertSafeKey($seg);
            if (!isset($current[$seg]) || !is_array($current[$seg])) {
                $current[$seg] = [];
            }
            $current = &$current[$seg];
        }
        $lastSeg = $segments[count($segments) - 1];
        SecurityGuard::assertSafeKey($lastSeg);
        $current[$lastSeg] = $value;
        return $result;
    }

    /**
     * @param array<mixed> $data
     * @param string[] $segments
     * @return array<mixed>
     */
    public static function removeBySegments(array $data, array $segments): array
    {
        $result = $data;
        $current = &$result;
        for ($i = 0; $i < count($segments) - 1; $i++) {
            $seg = $segments[$i];
            if (!isset($current[$seg]) || !is_array($current[$seg])) {
                return $result;
            }
            $current = &$current[$seg];
        }
        unset($current[$segments[count($segments) - 1]]);
        return $result;
    }

    /**
     * Renders a template path replacing {key} with bindings values.
     *
     * @param array<string, string|int> $bindings
     * @see TemplateRenderer::render()
     */
    public static function renderTemplate(string $template, array $bindings): string
    {
        return TemplateRenderer::render($template, $bindings);
    }
}
