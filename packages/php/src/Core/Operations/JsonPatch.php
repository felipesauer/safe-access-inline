<?php

declare(strict_types=1);

namespace SafeAccessInline\Core\Operations;

use SafeAccessInline\Contracts\JsonPatchOperation;
use SafeAccessInline\Enums\PatchOperationType;
use SafeAccessInline\Exceptions\JsonPatchTestFailedException;
use SafeAccessInline\Security\Guards\SecurityGuard;

/**
 * JSON Patch operations per RFC 6902.
 * Provides diff generation and patch application.
 *
 * The JSON Patch `test` op checks that the value at `path` equals `value`.
 * Both PHP and JS now treat an **absent path as a test failure** — a `test` op
 * against a missing path throws {@see JsonPatchTestFailedException} regardless of
 * the expected value. This aligns the two implementations:
 *
 *   - **PHP**: absent path → test FAILS (throws JsonPatchTestFailedException)
 *   - **JS**:  absent path → test FAILS (throws JsonPatchTestFailedError)
 *
 * A `test` op asserting `null` for a *present* `null`-valued path still passes;
 * only paths that do not exist at all will throw.
 */
final class JsonPatch
{
    /**
     * Generates a JSON Patch representing the differences between two arrays.
     *
     * @param array<mixed> $a        Source data.
     * @param array<mixed> $b        Target data.
     * @param string       $basePath Base JSON Pointer path.
     * @return JsonPatchOperation[]  Ordered list of typed patch operations.
     */
    public static function diff(array $a, array $b, string $basePath = ''): array
    {
        $ops = [];

        // Removed keys
        foreach (array_keys($a) as $key) {
            if (!array_key_exists($key, $b)) {
                $ops[] = new JsonPatchOperation(
                    op:   PatchOperationType::REMOVE->value,
                    path: $basePath . '/' . self::escapePointer((string) $key),
                );
            }
        }

        // Added or changed keys
        foreach ($b as $key => $bVal) {
            $pointer = $basePath . '/' . self::escapePointer((string) $key);

            if (!array_key_exists($key, $a)) {
                $ops[] = new JsonPatchOperation(
                    op:    PatchOperationType::ADD->value,
                    path:  $pointer,
                    value: $bVal,
                );
            } elseif (!self::deepEqual($a[$key], $bVal)) {
                $aVal = $a[$key];

                if (is_array($aVal) && is_array($bVal) && !array_is_list($aVal) && !array_is_list($bVal)) {
                    $ops = array_merge($ops, self::diff($aVal, $bVal, $pointer));
                } elseif (is_array($aVal) && is_array($bVal) && array_is_list($aVal) && array_is_list($bVal)) {
                    $ops = array_merge($ops, self::diffArrays($aVal, $bVal, $pointer));
                } else {
                    $ops[] = new JsonPatchOperation(
                        op:    PatchOperationType::REPLACE->value,
                        path:  $pointer,
                        value: $bVal,
                    );
                }
            }
        }

        return $ops;
    }

    /**
     * @param array<mixed> $a
     * @param array<mixed> $b
     * @param string $basePath
     * @return JsonPatchOperation[]
     */
    private static function diffArrays(array $a, array $b, string $basePath): array
    {
        $ops = [];
        $maxLen = max(count($a), count($b));

        for ($i = 0; $i < $maxLen; $i++) {
            $pointer = $basePath . '/' . $i;
            if ($i >= count($a)) {
                $ops[] = new JsonPatchOperation(
                    op:    PatchOperationType::ADD->value,
                    path:  $pointer,
                    value: $b[$i],
                );
            } elseif ($i >= count($b)) {
                $ops[] = new JsonPatchOperation(
                    op:   PatchOperationType::REMOVE->value,
                    path: $basePath . '/' . (count($a) - 1 - ($i - count($b))),
                );
            } elseif (!self::deepEqual($a[$i], $b[$i])) {
                if (is_array($a[$i]) && is_array($b[$i]) && !array_is_list($a[$i]) && !array_is_list($b[$i])) {
                    $ops = array_merge($ops, self::diff($a[$i], $b[$i], $pointer));
                } else {
                    $ops[] = new JsonPatchOperation(
                        op:    PatchOperationType::REPLACE->value,
                        path:  $pointer,
                        value: $b[$i],
                    );
                }
            }
        }

        return $ops;
    }

    /**
     * Validates a JSON Patch operations array without applying it.
     *
     * Checks that `move` and `copy` operations include the required `from` field.
     *
     * @param JsonPatchOperation[] $ops
     * @throws \InvalidArgumentException When a `move` or `copy` operation is missing `from`.
     */
    public static function validatePatch(array $ops): void
    {
        foreach ($ops as $op) {
            if (in_array($op->op, [PatchOperationType::MOVE->value, PatchOperationType::COPY->value], true) && $op->from === null) {
                throw new \InvalidArgumentException(
                    "JSON Patch '{$op->op}' operation requires a 'from' field."
                );
            }
        }
    }

    /**
     * Applies a JSON Patch to a data array. Returns a new array (immutable).
     *
     * **Atomicity:** When the patch contains `test` operations, all operations are first
     * applied to a preflight copy. If any `test` assertion fails, none of the changes
     * take effect (the exception is thrown before the result is returned).
     *
     * **Optimisation:** When there are no `test` operations, the preflight clone is
     * skipped — operations are applied directly to the local parameter copy.
     *
     * @param array<mixed>         $data
     * @param JsonPatchOperation[] $ops
     * @return array<mixed>
     */
    public static function applyPatch(array $data, array $ops): array
    {
        self::validatePatch($ops);

        // Optimisation: skip the preflight clone if no test ops need atomicity checking.
        $hasTestOps = array_reduce(
            $ops,
            static fn (bool $carry, JsonPatchOperation $op): bool => $carry || $op->op === PatchOperationType::TEST->value,
            false,
        );

        if (!$hasTestOps) {
            foreach ($ops as $op) {
                $data = self::applyOneOp($data, $op);
            }
            return $data;
        }

        // Pre-flight: run all operations on a copy; if a test op fails, the
        // whole patch is aborted and the original $data is left unchanged.
        $preflight = $data;
        foreach ($ops as $op) {
            $preflight = self::applyOneOp($preflight, $op);
        }

        return $preflight;
    }

    /**
     * Applies a single typed JSON Patch operation to a data array.
     *
     * @param  array<mixed>       $result Current data state.
     * @param  JsonPatchOperation $op     Typed patch operation to apply.
     * @return array<mixed>               Updated data state.
     */
    private static function applyOneOp(array $result, JsonPatchOperation $op): array
    {
        switch ($op->op) {
            case PatchOperationType::ADD->value:
            case PatchOperationType::REPLACE->value:
                $result = self::setAtPointer($result, $op->path, $op->value);
                break;
            case PatchOperationType::REMOVE->value:
                $result = self::removeAtPointer($result, $op->path);
                break;
            case PatchOperationType::MOVE->value:
                $value = self::getAtPointer($result, $op->from ?? '');
                $result = self::removeAtPointer($result, $op->from ?? '');
                $result = self::setAtPointer($result, $op->path, $value);
                break;
            case PatchOperationType::COPY->value:
                $value = self::getAtPointer($result, $op->from ?? '');
                $result = self::setAtPointer($result, $op->path, $value);
                break;
            case PatchOperationType::TEST->value:
                // Absent paths are treated as test failures — consistent with JS behaviour.
                if (!self::pathExistsAtPointer($result, $op->path)) {
                    throw new JsonPatchTestFailedException(
                        "Test operation failed: path '{$op->path}' does not exist."
                    );
                }
                $actual = self::getAtPointer($result, $op->path);
                if (!self::deepEqual($actual, $op->value)) {
                    throw new JsonPatchTestFailedException(
                        "Test operation failed: value at '{$op->path}' does not match expected value."
                    );
                }
                break;
        }

        return $result;
    }

    /**
     * Parses a JSON Pointer (RFC 6901) string into an array of key segments.
     *
     * An empty pointer returns an empty array (refers to the root document).
     * Tilde-escape sequences `~1` and `~0` are unescaped in each segment.
     *
     * @param  string $pointer JSON Pointer string, e.g. `/foo/bar/0`.
     * @return array<string> Ordered array of decoded path segments.
     */
    private static function parsePointer(string $pointer): array
    {
        if ($pointer === '') {
            return [];
        }
        $parts = explode('/', substr($pointer, 1));
        return array_map(
            fn (string $s) => str_replace(['~1', '~0'], ['/', '~'], $s),
            $parts
        );
    }

    /**
     * Escapes a key segment for use in a JSON Pointer (RFC 6901).
     *
     * Replaces `~` with `~0` and `/` with `~1` in that order.
     *
     * @param  string $key Raw key to escape.
     * @return string Escaped key safe for use in a Pointer path segment.
     */
    private static function escapePointer(string $key): string
    {
        return str_replace(['~', '/'], ['~0', '~1'], $key);
    }

    /**
     * Retrieves the value at the given JSON Pointer within `$data`.
     *
     * Returns null when any segment along the pointer path does not exist.
     * String keys are validated via {@see SecurityGuard::assertSafeKey()}.
     *
     * @param  mixed  $data    Data structure to traverse.
     * @param  string $pointer JSON Pointer path string.
     * @return mixed  The value at `$pointer`, or null when the path is absent.
     */
    private static function getAtPointer(mixed $data, string $pointer): mixed
    {
        $keys = self::parsePointer($pointer);
        $current = $data;
        foreach ($keys as $key) {
            if (is_array($current) && is_numeric($key) && array_key_exists((int) $key, $current)) {
                $current = $current[(int) $key];
            } elseif (is_array($current) && array_key_exists($key, $current)) {
                SecurityGuard::assertSafeKey($key);
                $current = $current[$key];
            } else {
                return null;
            }
        }
        return $current;
    }

    /**
     * Returns true when the JSON Pointer `$pointer` addresses an existing node in `$data`,
     * even when that node's value is `null`.
     *
     * Used by the `test` op to distinguish "path absent" from "path present with null value".
     *
     * @param  mixed  $data    Document root.
     * @param  string $pointer RFC 6901 JSON Pointer string.
     * @return bool   True when the path exists; false when any segment is missing.
     */
    private static function pathExistsAtPointer(mixed $data, string $pointer): bool
    {
        $keys = self::parsePointer($pointer);
        // Root pointer "" always exists.
        if (count($keys) === 0) {
            return true;
        }
        $current = $data;
        foreach ($keys as $key) {
            if (is_array($current) && is_numeric($key) && array_key_exists((int) $key, $current)) {
                $current = $current[(int) $key];
            } elseif (is_array($current) && array_key_exists($key, $current)) {
                $current = $current[$key];
            } else {
                return false;
            }
        }
        return true;
    }

    /**
     * @param array<mixed> $data
     * @param string $pointer
     * @param mixed $value
     * @return array<mixed>
     */
    private static function setAtPointer(array $data, string $pointer, mixed $value): array
    {
        $keys = self::parsePointer($pointer);
        if (count($keys) === 0) {
            return is_array($value) ? $value : $data;
        }

        $result = $data;
        $current = &$result;

        for ($i = 0; $i < count($keys) - 1; $i++) {
            $key = is_numeric($keys[$i]) ? (int) $keys[$i] : $keys[$i];
            if (is_string($key)) {
                SecurityGuard::assertSafeKey($key);
            }
            if (!array_key_exists($key, $current)) {
                $current[$key] = [];
            }
            $current = &$current[$key];
            assert(is_array($current));
        }

        $lastKey = end($keys);
        // PHPStan considers $current already narrowed to array after the assert() call above, making the is_array()
        // check redundant from its perspective; the explicit check is kept so the code remains safe when
        // assert() is disabled (assert.active=0 in php.ini), which is common in production environments.
        // @phpstan-ignore-next-line function.alreadyNarrowedType
        if ($lastKey === '-' && is_array($current)) {
            $current[] = $value;
        } else {
            $key = is_numeric($lastKey) ? (int) $lastKey : $lastKey;
            if (is_string($key)) {
                SecurityGuard::assertSafeKey($key);
            }
            $current[$key] = $value;
        }

        return $result;
    }

    /**
     * @param array<mixed> $data
     * @param string $pointer
     * @return array<mixed>
     */
    private static function removeAtPointer(array $data, string $pointer): array
    {
        $keys = self::parsePointer($pointer);
        if (count($keys) === 0) {
            return [];
        }

        $result = $data;
        $current = &$result;

        for ($i = 0; $i < count($keys) - 1; $i++) {
            $key = is_numeric($keys[$i]) ? (int) $keys[$i] : $keys[$i];
            if (is_string($key)) {
                SecurityGuard::assertSafeKey($key);
            }
            if (!is_array($current) || !array_key_exists($key, $current)) {
                return $result;
            }
            $current = &$current[$key];
        }

        $lastKey = end($keys);
        $key = is_numeric($lastKey) ? (int) $lastKey : $lastKey;
        if (is_string($key)) {
            SecurityGuard::assertSafeKey($key);
        }
        if (is_array($current)) {
            unset($current[$key]);
            // array_is_list() alone does not cover the case of an int key in a non-list (associative numeric) array;
            // the second condition is intentionally broader to re-index after any integer-keyed removal.
            // @phpstan-ignore greater.alwaysTrue
            if (array_is_list($current) || (is_int($key) && count($current) > 0)) {
                $current = array_values($current);
            }
        }

        return $result;
    }

    /**
     * Performs a deep equality check between two values.
     *
     * Arrays are compared recursively; strict (`===`) equality is used for
     * scalars and mismatched types.
     *
     * @param  mixed $a First value.
     * @param  mixed $b Second value.
     * @return bool True when `$a` and `$b` are deeply equal.
     */
    private static function deepEqual(mixed $a, mixed $b): bool
    {
        if ($a === $b) {
            return true;
        }
        if (!is_array($a) || !is_array($b)) {
            return false;
        }
        if (count($a) !== count($b)) {
            return false;
        }
        foreach ($a as $key => $value) {
            if (!array_key_exists($key, $b) || !self::deepEqual($value, $b[$key])) {
                return false;
            }
        }
        return true;
    }
}
