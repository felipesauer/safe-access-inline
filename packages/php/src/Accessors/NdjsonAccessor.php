<?php

declare(strict_types=1);

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
    /**
     * Creates an NdjsonAccessor from a Newline Delimited JSON string.
     *
     * Each line is parsed as a separate JSON object.
     *
     * @param  mixed $data     NDJSON string to parse.
     * @param  bool  $readonly Whether the accessor should be immutable.
     * @return static
     *
     * @throws InvalidFormatException If $data is not a string.
     */
    public static function from(mixed $data, bool $readonly = false): static
    {
        if (!is_string($data)) {
            throw new InvalidFormatException(
                'NdjsonAccessor expects an NDJSON string, got ' . gettype($data)
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

        $allLines = explode("\n", $raw);
        $lines = [];
        foreach ($allLines as $idx => $line) {
            $trimmed = trim($line);
            if ($trimmed !== '') {
                $lines[] = ['line' => $trimmed, 'originalLine' => $idx + 1];
            }
        }

        if (count($lines) === 0) {
            return [];
        }

        $result = [];
        $i = 0;
        foreach ($lines as $entry) {
            $decoded = json_decode($entry['line'], true);
            if (json_last_error() !== JSON_ERROR_NONE) {
                throw new InvalidFormatException(
                    'NdjsonAccessor failed to parse line ' . $entry['originalLine'] . ': ' . $entry['line']
                );
            }
            $result[$i] = $decoded;
            $i++;
        }

        return $result;
    }
}
