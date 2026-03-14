<?php

namespace SafeAccessInline\Traits;

use SafeAccessInline\Core\DotNotationParser;
use SafeAccessInline\Exceptions\InvalidFormatException;

/**
 * Array operations for accessor instances. All methods are immutable.
 */
trait HasArrayOperations
{
    public function push(string $path, mixed ...$items): static
    {
        $this->assertNotReadonly();
        $arr = $this->ensureArrayAt($path);
        return $this->setInternal($path, array_merge($arr, $items));
    }

    public function pop(string $path): static
    {
        $this->assertNotReadonly();
        $arr = $this->ensureArrayAt($path);
        array_pop($arr);
        return $this->setInternal($path, array_values($arr));
    }

    public function shift(string $path): static
    {
        $this->assertNotReadonly();
        $arr = $this->ensureArrayAt($path);
        array_shift($arr);
        return $this->setInternal($path, array_values($arr));
    }

    public function unshift(string $path, mixed ...$items): static
    {
        $this->assertNotReadonly();
        $arr = $this->ensureArrayAt($path);
        return $this->setInternal($path, array_merge($items, $arr));
    }

    public function insert(string $path, int $index, mixed ...$items): static
    {
        $this->assertNotReadonly();
        $arr = $this->ensureArrayAt($path);
        $idx = $index < 0 ? max(0, count($arr) + $index) : $index;
        array_splice($arr, $idx, 0, $items);
        return $this->setInternal($path, array_values($arr));
    }

    public function filterAt(string $path, callable $predicate): static
    {
        $this->assertNotReadonly();
        $arr = $this->ensureArrayAt($path);
        return $this->setInternal($path, array_values(array_filter($arr, $predicate, ARRAY_FILTER_USE_BOTH)));
    }

    public function mapAt(string $path, callable $transform): static
    {
        $this->assertNotReadonly();
        $arr = $this->ensureArrayAt($path);
        return $this->setInternal($path, array_values(array_map($transform, $arr, array_keys($arr))));
    }

    /**
     * @param 'asc'|'desc' $direction
     */
    public function sortAt(string $path, ?string $key = null, string $direction = 'asc'): static
    {
        $this->assertNotReadonly();
        $arr = $this->ensureArrayAt($path);
        $dir = $direction === 'desc' ? -1 : 1;
        usort($arr, function (mixed $a, mixed $b) use ($key, $dir): int {
            $va = $key !== null ? ($a[$key] ?? null) : $a;
            $vb = $key !== null ? ($b[$key] ?? null) : $b;
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

    public function flatten(string $path, int $depth = 1): static
    {
        $this->assertNotReadonly();
        $arr = $this->ensureArrayAt($path);
        return $this->setInternal($path, $this->flattenArrayItems($arr, $depth));
    }

    public function first(string $path, mixed $default = null): mixed
    {
        $arr = $this->getArrayOrEmptyAt($path);
        return count($arr) > 0 ? $arr[0] : $default;
    }

    public function last(string $path, mixed $default = null): mixed
    {
        $arr = $this->getArrayOrEmptyAt($path);
        return count($arr) > 0 ? $arr[count($arr) - 1] : $default;
    }

    public function nth(string $path, int $index, mixed $default = null): mixed
    {
        $arr = $this->getArrayOrEmptyAt($path);
        $idx = $index < 0 ? count($arr) + $index : $index;
        return ($idx >= 0 && $idx < count($arr)) ? $arr[$idx] : $default;
    }

    /**
     * @return array<mixed>
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
     * @return array<mixed>
     */
    private function getArrayOrEmptyAt(string $path): array
    {
        $value = $this->get($path);
        return is_array($value) && array_is_list($value) ? $value : [];
    }

    private function setInternal(string $path, mixed $value): static
    {
        $newData = DotNotationParser::set($this->data, $path, $value);
        $clone = clone $this;
        $clone->data = $newData;
        return $clone;
    }

    /**
     * @param array<mixed> $arr
     * @return array<mixed>
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
