<?php

namespace SafeAccessInline\Accessors;

use SafeAccessInline\Core\AbstractAccessor;
use SafeAccessInline\Exceptions\InvalidFormatException;

/**
 * Accessor for CSV strings.
 * The first line is treated as the header.
 * Result: indexed array of associative arrays.
 *
 * Example:
 *   "name,age\nAna,30\nBob,25" → [
 *     ['name' => 'Ana', 'age' => '30'],
 *     ['name' => 'Bob', 'age' => '25'],
 *   ]
 */
class CsvAccessor extends AbstractAccessor
{
    public static function from(mixed $data): static
    {
        if (!is_string($data)) {
            throw new InvalidFormatException(
                'CsvAccessor expects a CSV string, got ' . gettype($data)
            );
        }
        return new static($data); // @phpstan-ignore new.static
    }

    protected function parse(mixed $raw): array
    {
        assert(is_string($raw));
        $lines = array_filter(explode("\n", trim($raw)), fn (string $line) => $line !== '');

        if (count($lines) < 1) {
            return [];
        }

        $headers = str_getcsv(array_shift($lines), ',', '"', '');
        $result = [];

        foreach ($lines as $line) {
            $values = str_getcsv($line, ',', '"', '');
            if (count($values) === count($headers)) {
                $result[] = array_combine(array_map('strval', $headers), $values);
            }
        }

        return $result;
    }
}
