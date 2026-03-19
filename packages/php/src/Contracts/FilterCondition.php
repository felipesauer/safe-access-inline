<?php

declare(strict_types=1);

namespace SafeAccessInline\Contracts;

/**
 * A single condition within a filter expression.
 *
 * Represents a comparison like `field > value` or a function call
 * like `length(@.name) > 3`.
 */
final readonly class FilterCondition
{
    /**
     * @param string $field    The field path to evaluate (e.g. "age", "profile.name").
     * @param string $operator The comparison operator (==, !=, >, <, >=, <=).
     * @param mixed  $value    The value to compare against.
     * @param string|null $func     Optional function name (e.g. "length", "match", "keys").
     * @param array<string>|null $funcArgs Optional function arguments.
     */
    public function __construct(
        public string $field,
        public string $operator,
        public mixed $value,
        public ?string $func = null,
        public ?array $funcArgs = null,
    ) {
    }
}
