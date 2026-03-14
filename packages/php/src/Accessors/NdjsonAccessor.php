<?php

namespace SafeAccessInline\Accessors;

use SafeAccessInline\Core\AbstractAccessor;
use SafeAccessInline\Exceptions\InvalidFormatException;

/**
 * Accessor for NDJSON (Newline Delimited JSON) strings.
 * Each line is a separate JSON object.
 * Result: indexed array of parsed JSON objects.
 */
class NdjsonAccessor extends AbstractAccessor
{
    public static function from(mixed $data, bool $readonly = false): static
    {
        if (!is_string($data)) {
            throw new InvalidFormatException(
                'NdjsonAccessor expects an NDJSON string, got ' . gettype($data)
            );
        }
        return new static($data, $readonly); // @phpstan-ignore new.static
    }

    protected function parse(mixed $raw): array
    {
        assert(is_string($raw));

        $lines = array_filter(
            array_map('trim', explode("\n", $raw)),
            fn (string $line) => $line !== ''
        );

        if (count($lines) === 0) {
            return [];
        }

        $result = [];
        $i = 0;
        foreach ($lines as $line) {
            $decoded = json_decode($line, true);
            if (json_last_error() !== JSON_ERROR_NONE) {
                throw new InvalidFormatException(
                    'NdjsonAccessor failed to parse line ' . ($i + 1) . ': ' . $line
                );
            }
            $result[$i] = $decoded;
            $i++;
        }

        return $result;
    }
}
