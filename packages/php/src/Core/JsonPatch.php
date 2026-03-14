<?php

namespace SafeAccessInline\Core;

/**
 * JSON Patch operations per RFC 6902.
 * Provides diff generation and patch application.
 */
final class JsonPatch
{
    /**
     * Generates a JSON Patch representing the differences between two arrays.
     *
     * @param array<mixed> $a Source data
     * @param array<mixed> $b Target data
     * @param string $basePath Base JSON Pointer path
     * @return array<array{op: string, path: string, value?: mixed, from?: string}>
     */
    public static function diff(array $a, array $b, string $basePath = ''): array
    {
        $ops = [];

        // Removed keys
        foreach (array_keys($a) as $key) {
            if (!array_key_exists($key, $b)) {
                $ops[] = ['op' => 'remove', 'path' => $basePath . '/' . self::escapePointer((string) $key)];
            }
        }

        // Added or changed keys
        foreach ($b as $key => $bVal) {
            $pointer = $basePath . '/' . self::escapePointer((string) $key);

            if (!array_key_exists($key, $a)) {
                $ops[] = ['op' => 'add', 'path' => $pointer, 'value' => $bVal];
            } elseif (!self::deepEqual($a[$key], $bVal)) {
                $aVal = $a[$key];

                if (is_array($aVal) && is_array($bVal) && !array_is_list($aVal) && !array_is_list($bVal)) {
                    $ops = array_merge($ops, self::diff($aVal, $bVal, $pointer));
                } elseif (is_array($aVal) && is_array($bVal) && array_is_list($aVal) && array_is_list($bVal)) {
                    $ops = array_merge($ops, self::diffArrays($aVal, $bVal, $pointer));
                } else {
                    $ops[] = ['op' => 'replace', 'path' => $pointer, 'value' => $bVal];
                }
            }
        }

        return $ops;
    }

    /**
     * @param array<mixed> $a
     * @param array<mixed> $b
     * @param string $basePath
     * @return array<array{op: string, path: string, value?: mixed}>
     */
    private static function diffArrays(array $a, array $b, string $basePath): array
    {
        $ops = [];
        $maxLen = max(count($a), count($b));

        for ($i = 0; $i < $maxLen; $i++) {
            $pointer = $basePath . '/' . $i;
            if ($i >= count($a)) {
                $ops[] = ['op' => 'add', 'path' => $pointer, 'value' => $b[$i]];
            } elseif ($i >= count($b)) {
                $ops[] = ['op' => 'remove', 'path' => $basePath . '/' . (count($a) - 1 - ($i - count($b)))];
            } elseif (!self::deepEqual($a[$i], $b[$i])) {
                if (is_array($a[$i]) && is_array($b[$i]) && !array_is_list($a[$i]) && !array_is_list($b[$i])) {
                    $ops = array_merge($ops, self::diff($a[$i], $b[$i], $pointer));
                } else {
                    $ops[] = ['op' => 'replace', 'path' => $pointer, 'value' => $b[$i]];
                }
            }
        }

        return $ops;
    }

    /**
     * Applies a JSON Patch to a data array. Returns a new array (immutable).
     *
     * @param array<mixed> $data
     * @param array<array{op: string, path: string, value?: mixed, from?: string}> $ops
     * @return array<mixed>
     */
    public static function applyPatch(array $data, array $ops): array
    {
        $result = $data;

        foreach ($ops as $op) {
            switch ($op['op']) {
                case 'add':
                case 'replace':
                    $result = self::setAtPointer($result, $op['path'], $op['value'] ?? null);
                    break;
                case 'remove':
                    $result = self::removeAtPointer($result, $op['path']);
                    break;
                case 'move':
                    $value = self::getAtPointer($result, $op['from'] ?? '');
                    $result = self::removeAtPointer($result, $op['from'] ?? '');
                    $result = self::setAtPointer($result, $op['path'], $value);
                    break;
                case 'copy':
                    $value = self::getAtPointer($result, $op['from'] ?? '');
                    $result = self::setAtPointer($result, $op['path'], $value);
                    break;
                case 'test':
                    $actual = self::getAtPointer($result, $op['path']);
                    if (!self::deepEqual($actual, $op['value'] ?? null)) {
                        throw new \RuntimeException(
                            "Test operation failed: value at '{$op['path']}' does not match expected value."
                        );
                    }
                    break;
            }
        }

        return $result;
    }

    /**
     * @param string $pointer
     * @return array<string>
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

    private static function escapePointer(string $key): string
    {
        return str_replace(['~', '/'], ['~0', '~1'], $key);
    }

    private static function getAtPointer(mixed $data, string $pointer): mixed
    {
        $keys = self::parsePointer($pointer);
        $current = $data;
        foreach ($keys as $key) {
            if (is_array($current) && array_key_exists($key, $current)) {
                $current = $current[$key];
            } elseif (is_array($current) && is_numeric($key) && array_key_exists((int) $key, $current)) {
                $current = $current[(int) $key];
            } else {
                return null;
            }
        }
        return $current;
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
            if (!is_array($current) || !array_key_exists($key, $current)) {
                $current[$key] = [];
            }
            $current = &$current[$key];
        }

        $lastKey = end($keys);
        if ($lastKey === '-' && is_array($current)) {
            $current[] = $value;
        } else {
            $key = is_numeric($lastKey) ? (int) $lastKey : $lastKey;
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
            if (!is_array($current) || !array_key_exists($key, $current)) {
                return $result;
            }
            $current = &$current[$key];
        }

        $lastKey = end($keys);
        $key = is_numeric($lastKey) ? (int) $lastKey : $lastKey;
        if (is_array($current)) {
            unset($current[$key]);
            if (array_is_list($current) || (is_int($key) && count($current) > 0)) {
                $current = array_values($current);
            }
        }

        return $result;
    }

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
