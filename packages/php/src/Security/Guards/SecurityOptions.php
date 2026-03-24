<?php

declare(strict_types=1);

namespace SafeAccessInline\Security\Guards;

use SafeAccessInline\Exceptions\SecurityException;

/** Runtime security limits applied to parsing and traversal operations. */
final class SecurityOptions
{
    /** Maximum allowed structural depth for nested data. */
    public const MAX_DEPTH = 512;

    /** Maximum allowed payload size in bytes (10 MB). */
    public const MAX_PAYLOAD_BYTES = 10 * 1024 * 1024; // 10MB

    /** Maximum allowed number of keys across the entire data structure. */
    public const MAX_KEYS = 10_000;

    /**
     * Safety cap on recursive key-counting traversal depth.
     *
     * Distinct from {@see MAX_DEPTH}: this bounds only the counting algorithm itself
     * to prevent runaway recursion on deeply nested or self-referential structures.
     * Exposed as a public constant so callers can override it via {@see assertMaxKeys()}.
     */
    public const DEFAULT_MAX_COUNT_RECURSION_DEPTH = 100;

    /**
     * Asserts that a string payload does not exceed the byte limit.
     *
     * Uses `mb_strlen($input, '8bit')` for binary-safe byte counting, which is
     * equivalent to `strlen()` but explicit about the encoding context and
     * correct regardless of the `mbstring.func_overload` INI setting.
     *
     * @param  string   $input    Raw payload string to measure.
     * @param  int|null $maxBytes Override the default {@see MAX_PAYLOAD_BYTES} limit.
     *
     * @throws \SafeAccessInline\Exceptions\SecurityException When the payload exceeds the limit.
     */
    public static function assertPayloadSize(string $input, ?int $maxBytes = null): void
    {
        $limit = $maxBytes ?? self::MAX_PAYLOAD_BYTES;
        $size = mb_strlen($input, '8bit');
        if ($size > $limit) {
            throw new SecurityException(
                "Payload size {$size} bytes exceeds maximum of {$limit} bytes."
            );
        }
    }

    /**
     * Asserts that the total key count in a data structure does not exceed the limit.
     *
     * @param  array<mixed> $data             Data structure to count keys in recursively.
     * @param  int|null     $maxKeys          Override the default {@see MAX_KEYS} limit.
     * @param  int|null     $maxCountDepth    Override the default {@see DEFAULT_MAX_COUNT_RECURSION_DEPTH}
     *                                        cap on the internal counting traversal.
     *
     * @throws \SafeAccessInline\Exceptions\SecurityException When the key count exceeds the limit.
     */
    public static function assertMaxKeys(array $data, ?int $maxKeys = null, ?int $maxCountDepth = null): void
    {
        $limit = $maxKeys ?? self::MAX_KEYS;
        $count = self::countKeys($data, 0, $maxCountDepth ?? self::DEFAULT_MAX_COUNT_RECURSION_DEPTH);
        if ($count > $limit) {
            throw new SecurityException(
                "Data contains {$count} keys, exceeding maximum of {$limit}."
            );
        }
    }

    /**
     * Asserts that a recursion depth counter does not exceed the limit.
     *
     * @param  int      $currentDepth Current recursion depth.
     * @param  int|null $maxDepth     Override the default {@see MAX_DEPTH} limit.
     *
     * @throws \SafeAccessInline\Exceptions\SecurityException When depth exceeds the limit.
     */
    public static function assertMaxDepth(int $currentDepth, ?int $maxDepth = null): void
    {
        $limit = $maxDepth ?? self::MAX_DEPTH;
        if ($currentDepth > $limit) {
            throw new SecurityException(
                "Recursion depth {$currentDepth} exceeds maximum of {$limit}."
            );
        }
    }

    /**
     * Asserts that the structural depth of data does not exceed the given limit.
     *
     * The traversal is capped at `$maxDepth + 1` internally so that circular
     * PHP array references (constructed with `&`) cannot cause unbounded
     * recursion. When the cap is hit the returned depth already exceeds `$maxDepth`,
     * so the SecurityException is still thrown.
     *
     * @throws SecurityException
     */
    public static function assertMaxStructuralDepth(mixed $data, int $maxDepth): void
    {
        $depth = self::measureDepth($data, 0, $maxDepth + 1);
        if ($depth > $maxDepth) {
            throw new SecurityException(
                "Data structural depth {$depth} exceeds policy maximum of {$maxDepth}."
            );
        }
    }

    /**
     * Recursively counts the total number of keys across a nested data structure.
     *
     * The traversal is capped at `$maxDepth` to prevent infinite loops on
     * cyclically-referenced data.
     *
     * @param  mixed $obj      Data structure to count.
     * @param  int   $depth    Current recursion depth (internal).
     * @param  int   $maxDepth Maximum recursion depth cap (default: {@see DEFAULT_MAX_COUNT_RECURSION_DEPTH}).
     * @return int   Total key count.
     */
    private static function countKeys(mixed $obj, int $depth = 0, int $maxDepth = self::DEFAULT_MAX_COUNT_RECURSION_DEPTH): int
    {
        if ($depth > $maxDepth) {
            return 0;
        }
        if (!is_array($obj)) {
            return 0;
        }
        $count = count($obj);
        foreach ($obj as $value) {
            $count += self::countKeys($value, $depth + 1, $maxDepth);
        }
        return $count;
    }

    /**
     * Recursively measures the maximum nesting depth of `$value`.
     *
     * The optional `$maxDepth` cap terminates traversal early so that PHP arrays
     * containing circular references (created via `&`) cannot overflow the call
     * stack. When the cap is reached the current depth is returned immediately,
     * which is already above any caller-supplied limit and therefore still
     * triggers a SecurityException in {@see assertMaxStructuralDepth}.
     *
     * PHP arrays are copy-on-write value types; true self-referential cycles can
     * only exist when created with PHP reference assignments (`$a[] = &$a`).
     * The `$maxDepth` cap acts as the cycle-break: once traversal reaches
     * `$current >= $maxDepth` the recursion terminates immediately regardless of
     * whether the sub-tree is cyclic or merely very deep. There is therefore no
     * risk of unbounded recursion for any array reachable via normal PHP code or
     * user-supplied decoded JSON/YAML data.
     *
     * @param  mixed $value    Value to measure.
     * @param  int   $current  Depth of the current level.
     * @param  int   $maxDepth Upper bound on recursion (default: {@see MAX_DEPTH}).
     * @return int   Maximum depth reached in the subtree.
     */
    private static function measureDepth(mixed $value, int $current, int $maxDepth = self::MAX_DEPTH): int
    {
        if ($current >= $maxDepth || !is_array($value)) {
            return $current;
        }
        $max = $current;
        foreach ($value as $child) {
            $d = self::measureDepth($child, $current + 1, $maxDepth);
            if ($d > $max) {
                $max = $d;
            }
        }
        return $max;
    }
}
