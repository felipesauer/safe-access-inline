<?php

namespace SafeAccessInline\Accessors;

use SafeAccessInline\Core\AbstractAccessor;
use SafeAccessInline\Exceptions\InvalidFormatException;

/**
 * Accessor for PHP objects (stdClass, anonymous classes, DTOs, etc.).
 * Converts internally: object → JSON → associative array.
 */
class ObjectAccessor extends AbstractAccessor
{
    public static function from(mixed $data): static
    {
        if (!is_object($data)) {
            throw new InvalidFormatException(
                'ObjectAccessor expects an object, got ' . gettype($data)
            );
        }
        return new static($data); // @phpstan-ignore new.static
    }

    protected function parse(mixed $raw): array
    {
        $json = json_encode($raw);
        if ($json === false) {
            throw new InvalidFormatException(
                'ObjectAccessor failed to encode object to JSON: ' . json_last_error_msg()
            );
        }

        $decoded = json_decode($json, true);
        if (!is_array($decoded)) {
            return [];
        }

        return $decoded;
    }
}
