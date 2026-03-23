<?php

declare(strict_types=1);

namespace SafeAccessInline\Accessors;

use SafeAccessInline\Core\AbstractAccessor;
use SafeAccessInline\Exceptions\InvalidFormatException;

/**
 * Accessor for PHP objects (stdClass, anonymous classes, DTOs, etc.).
 *
 * Converts internally via `json_encode` → `json_decode` to produce an associative array,
 * which normalises nested objects and provides a consistent traversal surface.
 *
 * @note **Limitation:** the JSON roundtrip cannot represent PHP types that lack a JSON
 * equivalent — including `DateTime`, `SplStack`, resources, and class instances whose
 * `jsonSerialize()` is not implemented. Such values are silently dropped by `json_encode`.
 * When precision matters, pass an already-serialised array via {@link ArrayAccessor} instead.
 *
 * @example
 * SafeAccess::fromObject($dto)->get('address.city');
 * @extends AbstractAccessor<array<mixed>>
 */
class ObjectAccessor extends AbstractAccessor
{
    /**
     * Creates an ObjectAccessor from a PHP object.
     *
     * @param  mixed $data     Object (stdClass, DTO, etc.) to wrap.
     * @param  bool  $readonly Whether the accessor should be immutable.
     * @return static
     *
     * @throws InvalidFormatException If $data is not an object.
     */
    public static function from(mixed $data, bool $readonly = false): static
    {
        if (!is_object($data)) {
            throw new InvalidFormatException(
                'ObjectAccessor expects an object, got ' . gettype($data)
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
