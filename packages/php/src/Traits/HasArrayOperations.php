<?php

declare(strict_types=1);

namespace SafeAccessInline\Traits;

use SafeAccessInline\Core\Parsers\DotNotationParser;
use SafeAccessInline\Exceptions\InvalidFormatException;
use SafeAccessInline\Exceptions\ReadonlyViolationException;

/**
 * Array operations for accessor instances. All methods are immutable.
 */
trait HasArrayOperations
{
    /**
     * Appends one or more items to the end of the array at the given path.
     *
     * @param  string $path  Dot-notation path to the target array.
     * @param  mixed  ...$items Items to append.
     * @return static New accessor instance with the updated array.
     *
     * @throws ReadonlyViolationException If the accessor is frozen.
     * @throws InvalidFormatException     If the value at $path is not an array.
     */
    public function push(string $path, mixed ...$items): static
    {
        $this->assertNotReadonly();
        $arr = $this->ensureArrayAt($path);
        return $this->setInternal($path, array_merge($arr, $items));
    }

    /**
     * Removes the last element from the array at the given path.
     *
     * @param  string $path Dot-notation path to the target array.
     * @return static New accessor instance with the shortened array.
     *
     * @throws ReadonlyViolationException If the accessor is frozen.
     * @throws InvalidFormatException     If the value at $path is not an array.
     */
    public function pop(string $path): static
    {
        $this->assertNotReadonly();
        $arr = $this->ensureArrayAt($path);
        array_pop($arr);
        return $this->setInternal($path, array_values($arr));
    }

    /**
     * Removes the first element from the array at the given path.
     *
     * @param  string $path Dot-notation path to the target array.
     * @return static New accessor instance with the shortened array.
     *
     * @throws ReadonlyViolationException If the accessor is frozen.
     * @throws InvalidFormatException     If the value at $path is not an array.
     */
    public function shift(string $path): static
    {
        $this->assertNotReadonly();
        $arr = $this->ensureArrayAt($path);
        array_shift($arr);
        return $this->setInternal($path, array_values($arr));
    }

    /**
     * Prepends one or more items to the beginning of the array at the given path.
     *
     * @param  string $path    Dot-notation path to the target array.
     * @param  mixed  ...$items Items to prepend.
     * @return static New accessor instance with the updated array.
     *
     * @throws ReadonlyViolationException If the accessor is frozen.
     * @throws InvalidFormatException     If the value at $path is not an array.
     */
    public function unshift(string $path, mixed ...$items): static
    {
        $this->assertNotReadonly();
        $arr = $this->ensureArrayAt($path);
        return $this->setInternal($path, array_merge($items, $arr));
    }

    /**
     * Inserts one or more items at a specific index within the array at the given path.
     *
     * Negative indices count from the end of the array.
     *
     * @param  string $path    Dot-notation path to the target array.
     * @param  int    $index   Position at which to insert (negative = from end).
     * @param  mixed  ...$items Items to insert.
     * @return static New accessor instance with the updated array.
     *
     * @throws ReadonlyViolationException If the accessor is frozen.
     * @throws InvalidFormatException     If the value at $path is not an array.
     */
    public function insert(string $path, int $index, mixed ...$items): static
    {
        $this->assertNotReadonly();
        $arr = $this->ensureArrayAt($path);
        $idx = $index < 0 ? max(0, count($arr) + $index) : $index;
        array_splice($arr, $idx, 0, $items);
        return $this->setInternal($path, array_values($arr)); // @phpstan-ignore-line arrayValues.list
    }

    /**
     * Filters the array at the given path using a predicate callback.
     *
     * @param  string   $path      Dot-notation path to the target array.
     * @param  callable $predicate Callback receiving (value, key) — return true to keep.
     * @return static New accessor instance containing only matching elements.
     *
     * @throws ReadonlyViolationException If the accessor is frozen.
     * @throws InvalidFormatException     If the value at $path is not an array.
     */
    public function filterAt(string $path, callable $predicate): static
    {
        $this->assertNotReadonly();
        $arr = $this->ensureArrayAt($path);
        return $this->setInternal($path, array_values(array_filter($arr, $predicate, ARRAY_FILTER_USE_BOTH)));
    }

    /**
     * Applies a transform callback to every element of the array at the given path.
     *
     * @param  string   $path      Dot-notation path to the target array.
     * @param  callable $transform Callback receiving (value, key) — returns the new value.
     * @return static New accessor instance with transformed elements.
     *
     * @throws ReadonlyViolationException If the accessor is frozen.
     * @throws InvalidFormatException     If the value at $path is not an array.
     */
    public function mapAt(string $path, callable $transform): static
    {
        $this->assertNotReadonly();
        $arr = $this->ensureArrayAt($path);
        // @phpstan-ignore-next-line arrayValues.list
        return $this->setInternal($path, array_values(array_map($transform, $arr, array_keys($arr))));
    }

    /**
     * Sorts the array at the given path in ascending or descending order.
     *
     * When $key is provided, sorts an array of associative arrays by that key.
     *
     * @param  string      $path      Dot-notation path to the target array.
     * @param  string|null $key       Sub-key to sort by within each element, or null for direct comparison.
     * @param  'asc'|'desc' $direction Sort direction.
     * @return static New accessor instance with the sorted array.
     *
     * @throws ReadonlyViolationException If the accessor is frozen.
     * @throws InvalidFormatException     If the value at $path is not an array.
     */
    public function sortAt(string $path, ?string $key = null, string $direction = 'asc'): static
    {
        $this->assertNotReadonly();
        $arr = $this->ensureArrayAt($path);
        $dir = $direction === 'desc' ? -1 : 1;
        usort($arr, function (mixed $a, mixed $b) use ($key, $dir): int {
            $va = $key !== null ? (is_array($a) ? ($a[$key] ?? null) : null) : $a;
            $vb = $key !== null ? (is_array($b) ? ($b[$key] ?? null) : null) : $b;
            if ($va === $vb) {
                return 0;
            }
            if ($va === null) {
                return $dir;
            }
            if ($vb === null) {
                return -$dir;
            }
            return $va < $vb ? -$dir : $dir;
        });
        return $this->setInternal($path, $arr);
    }

    /**
     * Removes duplicate values from the array at the given path.
     *
     * When $key is provided, de-duplicates by comparing that sub-key within each element.
     *
     * @param  string      $path Dot-notation path to the target array.
     * @param  string|null $key  Sub-key to compare for uniqueness, or null for whole-value comparison.
     * @return static New accessor instance with duplicates removed.
     *
     * @throws ReadonlyViolationException If the accessor is frozen.
     * @throws InvalidFormatException     If the value at $path is not an array.
     */
    public function unique(string $path, ?string $key = null): static
    {
        $this->assertNotReadonly();
        $arr = $this->ensureArrayAt($path);
        if ($key !== null) {
            $seen = [];
            $result = [];
            foreach ($arr as $item) {
                $val = is_array($item) ? ($item[$key] ?? null) : null;
                $serialized = serialize($val);
                if (!isset($seen[$serialized])) {
                    $seen[$serialized] = true;
                    $result[] = $item;
                }
            }
            return $this->setInternal($path, $result);
        }
        return $this->setInternal($path, array_values(array_unique($arr, SORT_REGULAR)));
    }

    /**
     * Flattens nested arrays at the given path up to the specified depth.
     *
     * @param  string $path  Dot-notation path to the target array.
     * @param  int    $depth Maximum nesting levels to flatten (1 = one level).
     * @return static New accessor instance with the flattened array.
     *
     * @throws ReadonlyViolationException If the accessor is frozen.
     * @throws InvalidFormatException     If the value at $path is not an array.
     */
    public function flatten(string $path, int $depth = 1): static
    {
        $this->assertNotReadonly();
        $arr = $this->ensureArrayAt($path);
        return $this->setInternal($path, $this->flattenArrayItems($arr, $depth));
    }

    /**
     * Returns the first element of the array at the given path, or $default if empty.
     *
     * @param  string $path    Dot-notation path to the target array.
     * @param  mixed  $default Value returned when the array is empty.
     * @return mixed  The first element or $default.
     */
    public function first(string $path, mixed $default = null): mixed
    {
        $arr = $this->getArrayOrEmptyAt($path);
        return count($arr) > 0 ? $arr[0] : $default;
    }

    /**
     * Returns the last element of the array at the given path, or $default if empty.
     *
     * @param  string $path    Dot-notation path to the target array.
     * @param  mixed  $default Value returned when the array is empty.
     * @return mixed  The last element or $default.
     */
    public function last(string $path, mixed $default = null): mixed
    {
        $arr = $this->getArrayOrEmptyAt($path);
        return count($arr) > 0 ? $arr[count($arr) - 1] : $default;
    }

    /**
     * Returns the element at a specific index in the array at the given path.
     *
     * Negative indices count from the end of the array.
     *
     * @param  string $path    Dot-notation path to the target array.
     * @param  int    $index   Zero-based index (negative = from end).
     * @param  mixed  $default Value returned when the index is out of bounds.
     * @return mixed  The element at $index or $default.
     */
    public function nth(string $path, int $index, mixed $default = null): mixed
    {
        $arr = $this->getArrayOrEmptyAt($path);
        $idx = $index < 0 ? count($arr) + $index : $index;
        return ($idx >= 0 && $idx < count($arr)) ? $arr[$idx] : $default;
    }

    /**
     * Retrieves the array at `$path` or throws when the value is not a list.
     *
     * @param  string $path Dot-notation path to the target array.
     * @return array<mixed> The list at `$path`.
     *
     * @throws \SafeAccessInline\Exceptions\InvalidFormatException When the value is not an array.
     */
    private function ensureArrayAt(string $path): array
    {
        $value = $this->get($path);
        if (!is_array($value) || !array_is_list($value)) {
            throw new InvalidFormatException("Value at path '{$path}' is not an array.");
        }
        return $value;
    }

    /**
     * Returns the list at `$path`, or an empty array when the value is absent or not a list.
     *
     * @param  string $path Dot-notation path to the target array.
     * @return array<mixed> The list at `$path`, or `[]`.
     */
    private function getArrayOrEmptyAt(string $path): array
    {
        $value = $this->get($path);
        return is_array($value) && array_is_list($value) ? $value : [];
    }

    /**
     * Sets `$value` at `$path` and returns a new accessor instance with the updated data.
     *
     * Delegates to {@see AbstractAccessor::mutate()} so that `$data` never needs
     * to be written from outside the owner class.
     *
     * @param  string $path  Dot-notation path.
     * @param  mixed  $value Value to store.
     * @return static New instance with the applied change.
     */
    private function setInternal(string $path, mixed $value): static
    {
        return $this->mutate(DotNotationParser::set($this->data, $path, $value));
    }

    /**
     * Recursively flattens `$arr` up to `$depth` levels.
     *
     * @param  array<mixed> $arr   Array to flatten.
     * @param  int          $depth Maximum nesting levels to eliminate.
     * @return array<mixed> Flattened array.
     */
    private function flattenArrayItems(array $arr, int $depth): array
    {
        $result = [];
        foreach ($arr as $item) {
            if (is_array($item) && array_is_list($item) && $depth > 0) {
                $result = array_merge($result, $this->flattenArrayItems($item, $depth - 1));
            } else {
                $result[] = $item;
            }
        }
        return $result;
    }
}
