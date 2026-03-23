<?php

declare(strict_types=1);

namespace SafeAccessInline\Traits;

use SafeAccessInline\Core\Parsers\SegmentParser;
use SafeAccessInline\Core\Resolvers\PathResolver;
use SafeAccessInline\Enums\SegmentType;

/**
 * Debug operations for SafeAccess instances.
 *
 * Provides path-resolution introspection tools useful for diagnosing why a
 * deeply nested path returns `null` (missing key, wrong type, typo, etc.).
 */
trait HasDebugOperations
{
    /**
     * Walks `$path` segment by segment and reports the resolution status of each.
     *
     * Returns one array entry per segment. Stops at the first segment that cannot
     * be resolved — subsequent segments are not evaluated.
     *
     * Never throws, even for entirely invalid paths; always returns an array.
     *
     * @param  string $path Dot-notation path to trace, e.g. `'user.address.city'`.
     * @return list<array{segment: string, found: bool, type: string|null}>
     *
     * @example
     * ```php
     * $trace = $accessor->trace('user.address.city');
     * // [
     * //   ['segment' => 'user',    'found' => true,  'type' => 'object'],
     * //   ['segment' => 'address', 'found' => true,  'type' => 'object'],
     * //   ['segment' => 'city',    'found' => false, 'type' => null],
     * // ]
     * ```
     */
    public function trace(string $path): array
    {
        $segments = SegmentParser::parseSegments($path);
        $segmentCount = count($segments);
        $result = [];
        $current = $this->data;

        for ($i = 0; $i < $segmentCount; $i++) {
            $segment = $segments[$i];
            $label = self::segmentLabel($segment);

            if (!is_array($current)) {
                $result[] = ['segment' => $label, 'found' => false, 'type' => null];
                for ($j = $i + 1; $j < $segmentCount; $j++) {
                    $result[] = ['segment' => self::segmentLabel($segments[$j]), 'found' => false, 'type' => null];
                }
                break;
            }

            $sentinel = new \stdClass();
            $nextValue = PathResolver::resolve(
                $current,
                [$segment],
                0,
                $sentinel,
                50,
            );

            if ($nextValue === $sentinel) {
                $result[] = ['segment' => $label, 'found' => false, 'type' => null];
                for ($j = $i + 1; $j < $segmentCount; $j++) {
                    $result[] = ['segment' => self::segmentLabel($segments[$j]), 'found' => false, 'type' => null];
                }
                break;
            }

            $current = $nextValue;
            $result[] = ['segment' => $label, 'found' => true, 'type' => self::segmentValueType($current)];
        }

        return $result;
    }

    /**
     * Converts a parsed segment descriptor to its string representation.
     *
     * @param  array{type: SegmentType, value?: string, key?: string, expression?: array<mixed>, indices?: array<int>, keys?: array<string>, fields?: list<array{alias: string, source: string}>, start?: int|null, end?: int|null, step?: int|null} $segment Parsed segment from {@see SegmentParser::parseSegments()}.
     * @return string
     */
    private static function segmentLabel(array $segment): string
    {
        return match ($segment['type']) {
            SegmentType::KEY         => (string) ($segment['value'] ?? ''),
            SegmentType::WILDCARD    => '[*]',
            SegmentType::FILTER      => '[?...]',
            SegmentType::SLICE       => sprintf(
                '[%s:%s%s]',
                $segment['start'] ?? '',
                $segment['end'] ?? '',
                ($segment['step'] ?? null) !== null ? ':' . $segment['step'] : '',
            ),
            SegmentType::DESCENT      => '..' . ($segment['key'] ?? ''),
            SegmentType::DESCENT_MULTI => '..[' . implode(',', $segment['keys'] ?? []) . ']',
            SegmentType::MULTI_INDEX  => '[' . implode(',', $segment['indices'] ?? []) . ']',
            SegmentType::MULTI_KEY    => '[' . implode(',', $segment['keys'] ?? []) . ']',
            SegmentType::PROJECTION   => '{' . implode(',', array_column($segment['fields'] ?? [], 'alias')) . '}',
            default                   => $segment['type']->value,
        };
    }

    /**
     * Returns the type name of a resolved value for use in a trace entry.
     *
     * @param  mixed $val
     * @return string|null
     */
    private static function segmentValueType(mixed $val): ?string
    {
        if ($val === null) {
            return 'null';
        }
        if (is_bool($val)) {
            return 'boolean';
        }
        if (is_int($val) || is_float($val)) {
            return 'number';
        }
        if (is_string($val)) {
            return 'string';
        }
        if (is_array($val)) {
            return array_is_list($val) ? 'array' : 'object';
        }
        return 'object';
    }
}
