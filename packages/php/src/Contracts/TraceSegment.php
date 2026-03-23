<?php

declare(strict_types=1);

namespace SafeAccessInline\Contracts;

/**
 * A single step in the result of {@see \SafeAccessInline\Traits\HasDebugOperations::trace()}.
 *
 * Each instance corresponds to one parsed segment of the dot-notation path.
 * Segments after the first missing one are not included in the result array.
 *
 * This is the PHP counterpart of the TypeScript `TraceSegment` interface.
 */
final readonly class TraceSegment
{
    /**
     * @param string      $segment String representation of this segment (key name, `[*]`, `[?...]`, etc.).
     * @param bool        $found   `true` when the segment resolved to a defined value.
     * @param string|null $type    PHP type of the resolved value, or `null` when `found` is `false`.
     *                             Possible values: `'object'`, `'array'`, `'string'`, `'number'`,
     *                             `'boolean'`, `'null'`.
     */
    public function __construct(
        public readonly string $segment,
        public readonly bool $found,
        public readonly string|null $type,
    ) {
    }
}
