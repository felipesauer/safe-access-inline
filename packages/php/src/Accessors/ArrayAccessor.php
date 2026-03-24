<?php

declare(strict_types=1);

namespace SafeAccessInline\Accessors;

use SafeAccessInline\Core\AbstractAccessor;
use SafeAccessInline\Exceptions\InvalidFormatException;

/**
 * Accessor for native PHP arrays.
 * The simplest format — parse() just returns the array as-is.
 * @extends AbstractAccessor<array<mixed>>
 */
class ArrayAccessor extends AbstractAccessor
{
    /**
     * Creates an ArrayAccessor from a native PHP array or object.
     * Objects are cast to associative arrays via their public properties.
     *
     * @param  mixed $data     PHP array or object to wrap.
     * @param  bool  $readonly Whether the accessor should be immutable.
     * @return static
     *
     * @throws InvalidFormatException If $data is neither an array nor an object.
     */
    public static function from(mixed $data, bool $readonly = false): static
    {
        if (!is_array($data) && !is_object($data)) {
            throw new InvalidFormatException(
                'ArrayAccessor expects an array or object, got ' . gettype($data)
            );
        }
        $resolved = is_array($data) ? $data : (array) $data;
        return new static($resolved, $readonly); // @phpstan-ignore new.static
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
