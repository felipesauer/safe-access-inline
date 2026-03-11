<?php

namespace SafeAccessInline\Accessors;

use SafeAccessInline\Core\AbstractAccessor;
use SafeAccessInline\Exceptions\InvalidFormatException;

/**
 * Accessor for native PHP arrays.
 * The simplest format — parse() just returns the array as-is.
 */
class ArrayAccessor extends AbstractAccessor
{
    public static function from(mixed $data): static
    {
        if (!is_array($data)) {
            throw new InvalidFormatException(
                'ArrayAccessor expects an array, got ' . gettype($data)
            );
        }
        return new static($data); // @phpstan-ignore new.static
    }

    protected function parse(mixed $raw): array
    {
        /** @var array<mixed> $raw */
        return $raw;
    }
}
