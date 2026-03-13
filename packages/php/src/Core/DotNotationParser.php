<?php

namespace SafeAccessInline\Core;

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

        $segments = self::parseSegments($path);
        return self::resolve($data, $segments, 0, $default);
    }

    /**
     * @param mixed $current
     * @param array<array{type: string, value?: string, key?: string, expression?: array<mixed>}> $segments
     * @param int $index
     * @param mixed $default
     * @return mixed
     */
    private static function resolve(mixed $current, array $segments, int $index, mixed $default): mixed
    {
        if ($index >= count($segments)) {
            return $current;
        }

        $segment = $segments[$index];

        if ($segment['type'] === 'descent') {
            /** @var string $descentKey */
            $descentKey = $segment['key'] ?? '';
            return self::resolveDescent($current, $descentKey, $segments, $index + 1, $default);
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
     * @param array<array{type: string, value?: string, key?: string, expression?: array<mixed>}> $segments
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
     * @param array<array{type: string, value?: string, key?: string, expression?: array<mixed>}> $segments
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
     *
     * @param string $path
     * @return array<array{type: string, value?: string, key?: string, expression?: array<mixed>}>
     */
    private static function parseSegments(string $path): array
    {
        $segments = [];
        $i = 0;
        $len = strlen($path);

        while ($i < $len) {
            if ($path[$i] === '.') {
                // Recursive descent: ".."
                if ($i + 1 < $len && $path[$i + 1] === '.') {
                    $i += 2;
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

            // Index: [0]
            if ($path[$i] === '[') {
                $j = $i + 1;
                while ($j < $len && $path[$j] !== ']') {
                    $j++;
                }
                $segments[] = ['type' => 'key', 'value' => substr($path, $i + 1, $j - $i - 1)];
                $i = $j + 1;
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
