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

        $keys = self::parseKeys($path);
        $current = $data;

        foreach ($keys as $index => $key) {
            if ($key === '*') {
                if (!is_array($current)) {
                    return $default;
                }

                $remaining = array_slice($keys, $index + 1);
                if (count($remaining) === 0) {
                    return array_values($current);
                }

                $remainingPath = self::buildPath($remaining);
                $results = [];
                foreach ($current as $item) {
                    if (is_array($item)) {
                        $results[] = self::get($item, $remainingPath, $default);
                    } else {
                        $results[] = $default;
                    }
                }
                return $results;
            }

            if (is_array($current) && array_key_exists($key, $current)) {
                $current = $current[$key];
            } else {
                return $default;
            }
        }

        return $current;
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

    /**
     * Rebuilds a path from an array of keys (for wildcard recursion).
     *
     * @param array<string> $keys
     * @return string
     */
    private static function buildPath(array $keys): string
    {
        return implode('.', array_map(
            static fn (string $k): string => str_replace('.', '\.', $k),
            $keys
        ));
    }
}
