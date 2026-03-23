<?php

declare(strict_types=1);

namespace SafeAccessInline\Traits;

/**
 * Type-casting accessors for SafeAccess instances.
 *
 * All methods delegate to {@see \SafeAccessInline\Core\AbstractAccessor::get()} and apply
 * PHP type-coercion rules. Missing or null paths silently return the `$default` parameter.
 *
 * Coercion contract (parity with the TypeScript package):
 *   - Numeric strings `"42"` / `"3.14"` are coerced to their respective scalar types.
 *   - Boolean strings `"true"`, `"1"`, `"yes"` → `true`; `"false"`, `"0"`, `"no"` → `false`.
 *   - `getArray()` returns the value only when it is already a PHP array; otherwise `$default`.
 */
trait HasTypeAccess
{
    /**
     * Retrieves the value at `$path` cast to `int`.
     *
     * Numeric strings (e.g. `"42"`) are coerced. Returns `$default` when the path
     * is absent, the value is `null`, or the value is not numeric.
     *
     * @param  string $path    Dot-notation path.
     * @param  int    $default Fallback value (default `0`).
     * @return int
     */
    public function getInt(string $path, int $default = 0): int
    {
        $val = $this->get($path);
        if ($val === null) {
            return $default;
        }
        if (is_numeric($val)) {
            return (int) $val;
        }
        return $default;
    }

    /**
     * Retrieves the value at `$path` cast to `bool`.
     *
     * String representations are mapped: `"true"`, `"1"`, `"yes"` → `true`;
     * `"false"`, `"0"`, `"no"` → `false`. Numeric non-zero values are `true`.
     * Returns `$default` when the path is absent or no mapping applies.
     *
     * @param  string $path    Dot-notation path.
     * @param  bool   $default Fallback value (default `false`).
     * @return bool
     */
    public function getBool(string $path, bool $default = false): bool
    {
        $val = $this->get($path);
        if ($val === null) {
            return $default;
        }
        if (is_bool($val)) {
            return $val;
        }
        if (is_int($val) || is_float($val)) {
            return $val !== 0 && $val !== 0.0;
        }
        if (is_string($val)) {
            $lower = strtolower($val);
            if ($lower === 'true' || $lower === '1' || $lower === 'yes') {
                return true;
            }
            if ($lower === 'false' || $lower === '0' || $lower === 'no') {
                return false;
            }
        }
        return $default;
    }

    /**
     * Retrieves the value at `$path` cast to `string`.
     *
     * Scalar values (bool, int, float) are converted via `(string)` cast.
     * Returns `$default` when the path is absent, the value is `null`, or
     * the value is a non-scalar type (array, object).
     *
     * @param  string $path    Dot-notation path.
     * @param  string $default Fallback value (default `''`).
     * @return string
     */
    public function getString(string $path, string $default = ''): string
    {
        $val = $this->get($path);
        if ($val === null) {
            return $default;
        }
        if (is_scalar($val)) {
            return (string) $val;
        }
        return $default;
    }

    /**
     * Retrieves the value at `$path` as a PHP array.
     *
     * Returns `$default` when the path is absent or the value is not an array.
     * Does not coerce non-array values.
     *
     * @template TValue
     * @param  string          $path    Dot-notation path.
     * @param  array<TValue>   $default Fallback value (default `[]`).
     * @return array<TValue>
     */
    public function getArray(string $path, array $default = []): array
    {
        $val = $this->get($path);
        if (!is_array($val)) {
            return $default;
        }
        /** @var array<TValue> $val */
        return $val;
    }

    /**
     * Retrieves the value at `$path` cast to `float`.
     *
     * Numeric strings (e.g. `"3.14"`) are coerced. Returns `$default` when the path
     * is absent, the value is `null`, or the value is not numeric.
     *
     * @param  string $path    Dot-notation path.
     * @param  float  $default Fallback value (default `0.0`).
     * @return float
     */
    public function getFloat(string $path, float $default = 0.0): float
    {
        $val = $this->get($path);
        if ($val === null) {
            return $default;
        }
        if (is_numeric($val)) {
            return (float) $val;
        }
        return $default;
    }
}
