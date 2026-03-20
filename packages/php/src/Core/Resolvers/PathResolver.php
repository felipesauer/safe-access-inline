<?php

declare(strict_types=1);

namespace SafeAccessInline\Core\Resolvers;

use SafeAccessInline\Core\Parsers\FilterParser;
use SafeAccessInline\Enums\SegmentType;
use SafeAccessInline\Exceptions\SecurityException;

/**
 * Recursive path resolution engine for dot-notation segments.
 *
 * Handles wildcard expansion, filter evaluation, recursive descent,
 * multi-index, and slice operations. Called exclusively by
 * {@see DotNotationParser::get()}.
 */
final class PathResolver
{
    /**
     * Recursively resolves a value by walking the segment array.
     *
     * @param mixed $current      Current node in the data tree.
     * @param array<array{type: SegmentType|string, value?: string, key?: string, expression?: array<mixed>, indices?: array<int>, keys?: array<string>, start?: int|null, end?: int|null, step?: int|null}> $segments Parsed segment array.
     * @param int   $index        Current position in the segment array.
     * @param mixed $default      Value returned when the path does not exist.
     * @param int   $maxDepth     Maximum recursion depth.
     * @return mixed The resolved value, or `$default`.
     *
     * @throws SecurityException When recursion depth is exceeded.
     */
    public static function resolve(mixed $current, array $segments, int $index, mixed $default, int $maxDepth): mixed
    {
        if ($index > $maxDepth) {
            throw new SecurityException("Recursion depth {$index} exceeds maximum of {$maxDepth}.");
        }
        if ($index >= count($segments)) {
            return $current;
        }

        $segment = $segments[$index];

        if ($segment['type'] === SegmentType::DESCENT) {
            /** @var string $descentKey */
            $descentKey = $segment['key'] ?? '';
            return self::resolveDescent($current, $descentKey, $segments, $index + 1, $default, $maxDepth);
        }

        if ($segment['type'] === SegmentType::DESCENT_MULTI) {
            /** @var string[] $descentKeys */
            $descentKeys = $segment['keys'] ?? [];
            $results = [];
            foreach ($descentKeys as $dk) {
                self::collectDescent($current, $dk, $segments, $index + 1, $default, $results, $maxDepth);
            }
            return count($results) > 0 ? $results : $default;
        }

        if ($segment['type'] === SegmentType::WILDCARD) {
            if (!is_array($current)) {
                return $default;
            }
            $items = array_values($current);
            $nextIndex = $index + 1;
            if ($nextIndex >= count($segments)) {
                return $items;
            }
            return array_map(
                fn ($item) => self::resolve($item, $segments, $nextIndex, $default, $maxDepth),
                $items
            );
        }

        if ($segment['type'] === SegmentType::FILTER) {
            if (!is_array($current)) {
                return $default;
            }
            /** @var array{conditions: array<array{field: string, operator: string, value: mixed}>, logicals: array<string>} $filterExpr */
            $filterExpr = $segment['expression'] ?? [];
            $filtered = array_values(array_filter(
                array_values($current),
                fn ($item) => is_array($item) && FilterParser::evaluate($item, $filterExpr)
            ));
            $nextIndex = $index + 1;
            if ($nextIndex >= count($segments)) {
                return $filtered;
            }
            return array_map(
                fn ($item) => self::resolve($item, $segments, $nextIndex, $default, $maxDepth),
                $filtered
            );
        }

        if ($segment['type'] === SegmentType::MULTI_KEY) {
            if (!is_array($current)) {
                return $default;
            }
            $nextIndex = $index + 1;
            $segmentCount = count($segments);
            /** @var array<string> $multiKeys */
            $multiKeys = $segment['keys'] ?? [];
            return array_map(function ($k) use ($current, $segments, $nextIndex, $segmentCount, $default, $maxDepth) {
                $val = array_key_exists($k, $current) ? $current[$k] : $default;
                if ($nextIndex >= $segmentCount) {
                    return $val;
                }
                return self::resolve($val, $segments, $nextIndex, $default, $maxDepth);
            }, $multiKeys);
        }

        if ($segment['type'] === SegmentType::MULTI_INDEX) {
            if (!is_array($current)) {
                return $default;
            }
            $nextIndex = $index + 1;
            $segmentCount = count($segments);
            // Numeric indices
            /** @var array<int> $indices */
            $indices = $segment['indices'] ?? [];
            $items = array_values($current);
            $len = count($items);
            return array_map(function ($idx) use ($items, $len, $segments, $nextIndex, $segmentCount, $default, $maxDepth) {
                $resolved = $idx < 0 ? ($items[$len + $idx] ?? null) : ($items[$idx] ?? null);
                if ($resolved === null) {
                    return $default;
                }
                if ($nextIndex >= $segmentCount) {
                    return $resolved;
                }
                return self::resolve($resolved, $segments, $nextIndex, $default, $maxDepth);
            }, $indices);
        }

        if ($segment['type'] === SegmentType::SLICE) {
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
            $nextSliceIndex = $index + 1;
            if ($nextSliceIndex >= count($segments)) {
                return $sliced;
            }
            return array_map(
                fn ($item) => self::resolve($item, $segments, $nextSliceIndex, $default, $maxDepth),
                $sliced
            );
        }

        // type === SegmentType::KEY
        /** @var string $keyValue */
        $keyValue = $segment['value'] ?? '';
        if (is_array($current) && array_key_exists($keyValue, $current)) {
            return self::resolve($current[$keyValue], $segments, $index + 1, $default, $maxDepth);
        }
        return $default;
    }

    /**
     * Collects all values matching the recursive-descent key and returns them as an array.
     *
     * Wraps {@see collectDescent()} and returns the accumulated result array.
     *
     * @param  mixed  $current   Current data node to start descent from.
     * @param  string $key       Key to search for recursively.
     * @param  array<array{type: SegmentType|string, value?: string, key?: string, expression?: array<mixed>, indices?: array<int>, keys?: array<string>, start?: int|null, end?: int|null, step?: int|null}> $segments Full segment array.
     * @param  int    $nextIndex Segment index to continue resolution from after the key is found.
     * @param  mixed  $default   Default value for unresolved continuations.
     * @param  int    $maxDepth  Maximum recursion depth.
     * @return array<mixed> All matched and post-processed values.
     */
    private static function resolveDescent(mixed $current, string $key, array $segments, int $nextIndex, mixed $default, int $maxDepth): array
    {
        $results = [];
        self::collectDescent($current, $key, $segments, $nextIndex, $default, $results, $maxDepth);
        return $results;
    }

    /**
     * Recursively walks `$current` to accumulate values matching `$key`.
     *
     * For each node in the subtree: if the key exists, the associated value
     * (or the result of continuing the segment chain) is appended to `$results`.
     * The walk then descends into all child arrays regardless of whether the
     * key was found at the current level.
     *
     * @param  mixed  $current   Current data node to inspect.
     * @param  string $key       Key to search for at every level.
     * @param  array<array{type: SegmentType|string, value?: string, key?: string, expression?: array<mixed>, indices?: array<int>, keys?: array<string>, start?: int|null, end?: int|null, step?: int|null}> $segments Full segment array.
     * @param  int    $nextIndex Segment index to continue from after the key is found.
     * @param  mixed  $default   Default value for unresolved continuations.
     * @param  array<mixed> &$results Accumulator — matched values are appended here.
     * @param  int    $maxDepth  Maximum recursion depth.
     */
    private static function collectDescent(mixed $current, string $key, array $segments, int $nextIndex, mixed $default, array &$results, int $maxDepth): void
    {
        if (!is_array($current)) {
            return;
        }

        if (array_key_exists($key, $current)) {
            if ($nextIndex >= count($segments)) {
                $results[] = $current[$key];
            } else {
                $resolved = self::resolve($current[$key], $segments, $nextIndex, $default, $maxDepth);
                if (is_array($resolved) && array_is_list($resolved)) {
                    array_push($results, ...$resolved);
                } else {
                    $results[] = $resolved;
                }
            }
        }

        foreach (array_values($current) as $child) {
            if (is_array($child)) {
                self::collectDescent($child, $key, $segments, $nextIndex, $default, $results, $maxDepth);
            }
        }
    }
}
