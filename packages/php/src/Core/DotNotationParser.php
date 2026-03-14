<?php

namespace SafeAccessInline\Core;

use SafeAccessInline\Exceptions\SecurityException;
use SafeAccessInline\Security\SecurityGuard;

/**
 * Core engine for resolving paths with dot notation.
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
    private const MAX_RESOLVE_DEPTH = 512;

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
        return self::resolve($data, $segments, 0, $default);
    }

    /**
     * @return array<array{type: string, value?: string, key?: string, expression?: array<mixed>, indices?: array<int>, keys?: array<string>, start?: int|null, end?: int|null, step?: int|null}>
     */
    private static function cachedParseSegments(string $path): array
    {
        $cached = PathCache::get($path);
        if ($cached !== null) {
            /** @var array<array{type: string, value?: string, key?: string, expression?: array<mixed>, indices?: array<int>, keys?: array<string>, start?: int|null, end?: int|null, step?: int|null}> $cached */
            return $cached;
        }
        $segments = self::parseSegments($path);
        PathCache::set($path, $segments);
        return $segments;
    }

    /**
     * @param mixed $current
     * @param array<array{type: string, value?: string, key?: string, expression?: array<mixed>, indices?: array<int>, keys?: array<string>, start?: int|null, end?: int|null, step?: int|null}> $segments
     * @param int $index
     * @param mixed $default
     * @return mixed
     */
    private static function resolve(mixed $current, array $segments, int $index, mixed $default): mixed
    {
        if ($index > self::MAX_RESOLVE_DEPTH) {
            throw new SecurityException("Recursion depth {$index} exceeds maximum of " . self::MAX_RESOLVE_DEPTH . '.');
        }
        if ($index >= count($segments)) {
            return $current;
        }

        $segment = $segments[$index];

        if ($segment['type'] === 'descent') {
            /** @var string $descentKey */
            $descentKey = $segment['key'] ?? '';
            return self::resolveDescent($current, $descentKey, $segments, $index + 1, $default);
        }

        if ($segment['type'] === 'descent-multi') {
            /** @var string[] $descentKeys */
            $descentKeys = $segment['keys'] ?? [];
            $results = [];
            foreach ($descentKeys as $dk) {
                self::collectDescent($current, $dk, $segments, $index + 1, $default, $results);
            }
            return count($results) > 0 ? $results : $default;
        }

        if ($segment['type'] === 'wildcard') {
            if (!is_array($current)) {
                return $default;
            }
            $items = array_values($current);
            $remaining = array_slice($segments, $index + 1);
            if (count($remaining) === 0) {
                return $items;
            }
            return array_map(
                fn ($item) => self::resolve($item, $remaining, 0, $default),
                $items
            );
        }

        if ($segment['type'] === 'filter') {
            if (!is_array($current)) {
                return $default;
            }
            /** @var array{conditions: array<array{field: string, operator: string, value: mixed}>, logicals: array<string>} $filterExpr */
            $filterExpr = $segment['expression'] ?? [];
            $filtered = array_values(array_filter(
                array_values($current),
                fn ($item) => is_array($item) && FilterParser::evaluate($item, $filterExpr)
            ));
            $remaining = array_slice($segments, $index + 1);
            if (count($remaining) === 0) {
                return $filtered;
            }
            return array_map(
                fn ($item) => self::resolve($item, $remaining, 0, $default),
                $filtered
            );
        }

        if ($segment['type'] === 'multi-index') {
            if (!is_array($current)) {
                return $default;
            }
            $remaining = array_slice($segments, $index + 1);
            // Multi-key mode (string keys)
            if (isset($segment['keys'])) {
                /** @var array<string> $multiKeys */
                $multiKeys = $segment['keys'];
                return array_map(function ($k) use ($current, $remaining, $default) {
                    $val = array_key_exists($k, $current) ? $current[$k] : $default;
                    if (count($remaining) === 0) {
                        return $val;
                    }
                    return self::resolve($val, $remaining, 0, $default);
                }, $multiKeys);
            }
            // Numeric indices
            /** @var array<int> $indices */
            $indices = $segment['indices'] ?? [];
            $items = array_values($current);
            $len = count($items);
            return array_map(function ($idx) use ($items, $len, $remaining, $default) {
                $resolved = $idx < 0 ? ($items[$len + $idx] ?? null) : ($items[$idx] ?? null);
                if ($resolved === null) {
                    return $default;
                }
                if (count($remaining) === 0) {
                    return $resolved;
                }
                return self::resolve($resolved, $remaining, 0, $default);
            }, $indices);
        }

        if ($segment['type'] === 'slice') {
            if (!is_array($current)) {
                return $default;
            }
            $items = array_values($current);
            $len = count($items);
            $step = $segment['step'] ?? 1;
            $start = $segment['start'] ?? ($step > 0 ? 0 : $len - 1);
            $end = $segment['end'] ?? ($step > 0 ? $len : -$len - 1);
            if ($start < 0) {
                $start = max($len + $start, 0);
            }
            if ($end < 0) {
                $end = $len + $end;
            }
            if ($start >= $len) {
                $start = $len;
            }
            if ($end > $len) {
                $end = $len;
            }
            $sliced = [];
            if ($step > 0) {
                for ($si = $start; $si < $end; $si += $step) {
                    $sliced[] = $items[$si];
                }
            } else {
                for ($si = $start; $si > $end; $si += $step) {
                    $sliced[] = $items[$si];
                }
            }
            $remaining = array_slice($segments, $index + 1);
            if (count($remaining) === 0) {
                return $sliced;
            }
            return array_map(
                fn ($item) => self::resolve($item, $remaining, 0, $default),
                $sliced
            );
        }

        // type === 'key'
        /** @var string $keyValue */
        $keyValue = $segment['value'] ?? '';
        if (is_array($current) && array_key_exists($keyValue, $current)) {
            return self::resolve($current[$keyValue], $segments, $index + 1, $default);
        }
        return $default;
    }

    /**
     * @param mixed $current
     * @param string $key
     * @param array<array{type: string, value?: string, key?: string, expression?: array<mixed>, indices?: array<int>, keys?: array<string>, start?: int|null, end?: int|null, step?: int|null}> $segments
     * @param int $nextIndex
     * @param mixed $default
     * @return array<mixed>
     */
    private static function resolveDescent(mixed $current, string $key, array $segments, int $nextIndex, mixed $default): array
    {
        $results = [];
        self::collectDescent($current, $key, $segments, $nextIndex, $default, $results);
        return $results;
    }

    /**
     * @param mixed $current
     * @param string $key
     * @param array<array{type: string, value?: string, key?: string, expression?: array<mixed>, indices?: array<int>, keys?: array<string>, start?: int|null, end?: int|null, step?: int|null}> $segments
     * @param int $nextIndex
     * @param mixed $default
     * @param array<mixed> &$results
     */
    private static function collectDescent(mixed $current, string $key, array $segments, int $nextIndex, mixed $default, array &$results): void
    {
        if (!is_array($current)) {
            return;
        }

        if (array_key_exists($key, $current)) {
            if ($nextIndex >= count($segments)) {
                $results[] = $current[$key];
            } else {
                $resolved = self::resolve($current[$key], $segments, $nextIndex, $default);
                if (is_array($resolved) && array_is_list($resolved)) {
                    array_push($results, ...$resolved);
                } else {
                    $results[] = $resolved;
                }
            }
        }

        foreach (array_values($current) as $child) {
            if (is_array($child)) {
                self::collectDescent($child, $key, $segments, $nextIndex, $default, $results);
            }
        }
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
        $keys = self::parseKeys($path);
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
    private static function deepMerge(array $target, array $source): array
    {
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
                $result[$key] = self::deepMerge($result[$key], $srcVal);
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
        $keys = self::parseKeys($path);
        $result = $data;
        $current = &$result;

        $lastKey = array_pop($keys);
        if ($lastKey === null) { // @codeCoverageIgnore
            return $result; // @codeCoverageIgnore
        }

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
     * Parses a path into typed segments for the get() engine.
     * Supports: keys, wildcards (*), filters ([?...]), recursive descent (..),
     * multi-index ([0,1,2]), slice ([0:5], [::2]), bracket notation (['key']),
     * and root anchor ($).
     *
     * @param string $path
     * @return array<array{type: string, value?: string, key?: string, expression?: array<mixed>, indices?: array<int>, keys?: array<string>, start?: int|null, end?: int|null, step?: int|null}>
     */
    private static function parseSegments(string $path): array
    {
        $segments = [];
        $i = 0;
        $len = strlen($path);

        // Strip root anchor $
        if ($len > 0 && $path[0] === '$') {
            $i = 1;
            if ($i < $len && $path[$i] === '.') {
                $i++;
            }
        }

        while ($i < $len) {
            if ($path[$i] === '.') {
                // Recursive descent: ".."
                if ($i + 1 < $len && $path[$i + 1] === '.') {
                    $i += 2;
                    // Check for bracket notation after ".." → ..['key1','key2']
                    if ($i < $len && $path[$i] === '[') {
                        $j = $i + 1;
                        while ($j < $len && $path[$j] !== ']') {
                            $j++;
                        }
                        $inner = substr($path, $i + 1, $j - $i - 1);
                        $i = $j + 1;
                        if (str_contains($inner, ',')) {
                            $parts = array_map('trim', explode(',', $inner));
                            $allQuoted = true;
                            foreach ($parts as $p) {
                                if (
                                    !(str_starts_with($p, "'") && str_ends_with($p, "'")) &&
                                    !(str_starts_with($p, '"') && str_ends_with($p, '"'))
                                ) {
                                    $allQuoted = false;
                                    break;
                                }
                            }
                            if ($allQuoted) {
                                $keys = array_map(fn (string $p): string => substr($p, 1, -1), $parts);
                                $segments[] = ['type' => 'descent-multi', 'keys' => $keys];
                                continue;
                            }
                        }
                        // Single quoted key after ..
                        if (preg_match('/^([\'"])(.*?)\\1$/', $inner, $m)) {
                            $segments[] = ['type' => 'descent', 'key' => $m[2]];
                            continue;
                        }
                        // Unquoted key in brackets
                        $segments[] = ['type' => 'descent', 'key' => $inner];
                        continue;
                    }
                    $key = '';
                    while ($i < $len && $path[$i] !== '.' && $path[$i] !== '[') {
                        if ($path[$i] === '\\' && $i + 1 < $len && $path[$i + 1] === '.') {
                            $key .= '.';
                            $i += 2;
                        } else {
                            $key .= $path[$i];
                            $i++;
                        }
                    }
                    if ($key !== '') {
                        $segments[] = ['type' => 'descent', 'key' => $key];
                    }
                    continue;
                }
                $i++;
                continue;
            }

            // Filter: [?...]
            if ($path[$i] === '[' && $i + 1 < $len && $path[$i + 1] === '?') {
                $depth = 1;
                $j = $i + 1;
                while ($j < $len && $depth > 0) {
                    $j++;
                    if ($j < $len && $path[$j] === '[') {
                        $depth++;
                    }
                    if ($j < $len && $path[$j] === ']') {
                        $depth--;
                    }
                }
                $filterExpr = substr($path, $i + 2, $j - $i - 2);
                $segments[] = ['type' => 'filter', 'expression' => FilterParser::parse($filterExpr)];
                $i = $j + 1;
                continue;
            }

            // Bracket notation: [0], [0,1,2], [0:5], ['key'], ["key"]
            if ($path[$i] === '[') {
                $j = $i + 1;
                while ($j < $len && $path[$j] !== ']') {
                    $j++;
                }
                $inner = substr($path, $i + 1, $j - $i - 1);
                $i = $j + 1;

                // Multi-index: [0,1,2] or multi-key: ['a','b'] — check before single-quoted
                if (str_contains($inner, ',')) {
                    $parts = array_map('trim', explode(',', $inner));
                    // Check if all parts are quoted strings (multi-key)
                    $allQuoted = true;
                    foreach ($parts as $p) {
                        if (
                            !(str_starts_with($p, "'") && str_ends_with($p, "'"))
                            && !(str_starts_with($p, '"') && str_ends_with($p, '"'))
                        ) {
                            $allQuoted = false;
                            break;
                        }
                    }
                    if ($allQuoted) {
                        $keys = array_map(fn ($p) => substr($p, 1, -1), $parts);
                        $segments[] = ['type' => 'multi-index', 'indices' => [], 'keys' => $keys];
                        continue;
                    }
                    $indices = array_map('intval', $parts);
                    $allNumeric = true;
                    foreach ($parts as $p) {
                        if (!is_numeric(trim($p))) {
                            $allNumeric = false;
                            break;
                        }
                    }
                    if ($allNumeric) {
                        $segments[] = ['type' => 'multi-index', 'indices' => $indices];
                        continue;
                    }
                }

                // Quoted bracket key: ['key'] or ["key"]
                if (preg_match('/^([\'"])(.*?)\1$/', $inner, $quotedMatch)) {
                    $segments[] = ['type' => 'key', 'value' => $quotedMatch[2]];
                    continue;
                }

                // Slice: [start:end:step]
                if (str_contains($inner, ':')) {
                    $sliceParts = explode(':', $inner);
                    $start = $sliceParts[0] !== '' ? (int) $sliceParts[0] : null;
                    $end = count($sliceParts) > 1 && $sliceParts[1] !== '' ? (int) $sliceParts[1] : null;
                    $step = count($sliceParts) > 2 && $sliceParts[2] !== '' ? (int) $sliceParts[2] : null;
                    $segments[] = ['type' => 'slice', 'start' => $start, 'end' => $end, 'step' => $step];
                    continue;
                }

                // Regular index/key
                $segments[] = ['type' => 'key', 'value' => $inner];
                continue;
            }

            // Wildcard
            if ($path[$i] === '*') {
                $segments[] = ['type' => 'wildcard'];
                $i++;
                continue;
            }

            // Regular key
            $key = '';
            while ($i < $len && $path[$i] !== '.' && $path[$i] !== '[') {
                if ($path[$i] === '\\' && $i + 1 < $len && $path[$i + 1] === '.') {
                    $key .= '.';
                    $i += 2;
                } else {
                    $key .= $path[$i];
                    $i++;
                }
            }
            if ($key !== '') {
                $segments[] = ['type' => 'key', 'value' => $key];
            }
        }

        return $segments;
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
     */
    public static function renderTemplate(string $template, array $bindings): string
    {
        return (string) preg_replace_callback('/\{([^}]+)\}/', function (array $matches) use ($bindings, $template): string {
            $key = $matches[1];
            if (!array_key_exists($key, $bindings)) {
                throw new \RuntimeException("Missing binding for key '{$key}' in template '{$template}'");
            }
            return (string) $bindings[$key];
        }, $template);
    }

    /**
     * Parses a path string into an array of keys.
     * Handles: escaped dots (\.), bracket notation ([0]).
     *
     * @param string $path
     * @return array<string>
     */
    private static function parseKeys(string $path): array
    {
        // 1. Convert brackets to dot notation: "a[0][1]" → "a.0.1"
        $path = preg_replace('/\[([^\]]+)\]/', '.$1', $path) ?? $path;

        // 2. Split by "." respecting escaped "\."
        $placeholder = "\x00ESC_DOT\x00";
        $path = str_replace('\.', $placeholder, $path);
        $keys = explode('.', $path);

        // 3. Restore escaped dots
        return array_map(
            fn (string $k) => str_replace($placeholder, '.', $k),
            $keys
        );
    }
}
