<?php

declare(strict_types=1);

namespace SafeAccessInline\Accessors;

use SafeAccessInline\Core\AbstractAccessor;
use SafeAccessInline\Exceptions\InvalidFormatException;

/**
 * Accessor for JSON strings.
 *
 * Decodes a JSON string into an associative array using `json_decode` with
 * `JSON_THROW_ON_ERROR` semantics (wrapped in a humanised {@link InvalidFormatException}).
 * An empty or non-object/array root (e.g. a bare JSON scalar) is safely normalised to `[]`.
 *
 * @example
 * SafeAccess::fromJson($json)->get('user.name');
 * @extends AbstractAccessor<array<mixed>>
 */
class JsonAccessor extends AbstractAccessor
{
    /**
     * Creates a JsonAccessor from a JSON-encoded string.
     *
     * @param  mixed $data     JSON string to parse.
     * @param  bool  $readonly Whether the accessor should be immutable.
     * @return static
     *
     * @throws InvalidFormatException If $data is not a string.
     */
    public static function from(mixed $data, bool $readonly = false): static
    {
        if (!is_string($data)) {
            throw new InvalidFormatException(
                'JsonAccessor expects a JSON string, got ' . gettype($data)
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
        assert(is_string($raw));
        $decoded = json_decode($raw, true);

        if (json_last_error() !== JSON_ERROR_NONE) {
            throw new InvalidFormatException(
                'JsonAccessor failed to parse JSON: ' . json_last_error_msg()
            );
        }

        return is_array($decoded) ? $decoded : [];
    }
}
