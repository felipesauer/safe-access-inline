<?php

declare(strict_types=1);

namespace SafeAccessInline\Accessors;

use SafeAccessInline\Core\AbstractAccessor;
use SafeAccessInline\Exceptions\InvalidFormatException;

/**
 * Accessor for native PHP arrays.
 * The simplest format — parse() just returns the array as-is.
 */
class ArrayAccessor extends AbstractAccessor
{
    /**
     * Creates an ArrayAccessor from a native PHP array.
     *
     * @param  mixed $data     PHP array to wrap.
     * @param  bool  $readonly Whether the accessor should be immutable.
     * @return static
     *
     * @throws InvalidFormatException If $data is not an array.
     */
    public static function from(mixed $data, bool $readonly = false): static
    {
        if (!is_array($data)) {
            throw new InvalidFormatException(
                'ArrayAccessor expects an array, got ' . gettype($data)
            );
        }
        return new static($data, $readonly); // @phpstan-ignore new.static
    }

    /**
     * @param mixed $raw
     * @return array<mixed>
     */
    protected function parse(mixed $raw): array
    {
        /** @var array<mixed> $raw */
        return $raw;
    }
}
