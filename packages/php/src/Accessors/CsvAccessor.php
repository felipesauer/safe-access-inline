<?php

declare(strict_types=1);

namespace SafeAccessInline\Accessors;

use SafeAccessInline\Core\AbstractAccessor;
use SafeAccessInline\Enums\AuditEventType;
use SafeAccessInline\Exceptions\InvalidFormatException;
use SafeAccessInline\Security\Audit\AuditLogger;
use SafeAccessInline\Security\Guards\SecurityPolicy;
use SafeAccessInline\Security\Sanitizers\CsvSanitizer;

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
 * @extends AbstractAccessor<array<mixed>>
 */
class CsvAccessor extends AbstractAccessor
{
    /**
     * Creates a CsvAccessor from a CSV-formatted string.
     *
     * The first line is treated as the header row.
     *
     * @param  mixed $data     CSV string to parse.
     * @param  bool  $readonly Whether the accessor should be immutable.
     * @return static
     *
     * @throws InvalidFormatException If $data is not a string.
     */
    public static function from(mixed $data, bool $readonly = false): static
    {
        if (!is_string($data)) {
            throw new InvalidFormatException(
                'CsvAccessor expects a CSV string, got ' . gettype($data)
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
        $lines = array_filter(explode("\n", trim($raw)), fn (string $line) => $line !== '');

        if (count($lines) < 1) {
            return [];
        }

        $csvMode = SecurityPolicy::getGlobal() !== null ? SecurityPolicy::getGlobal()->csvMode : 'none';

        // Sanitize header names with the same strategy applied to data cells so
        // that CSV injection payloads in column names are neutralised.
        $rawHeaders = str_getcsv(array_shift($lines), ',', '"', '');
        $headers = CsvSanitizer::sanitizeHeaders(array_map('strval', $rawHeaders), $csvMode);

        $result = [];

        foreach ($lines as $lineIndex => $line) {
            $values = str_getcsv($line, ',', '"', '');
            if (count($values) === count($headers)) {
                $result[] = array_combine($headers, $values);
            } else {
                AuditLogger::emit(AuditEventType::DATA_FORMAT_WARNING->value, [
                    'reason' => 'csv_column_mismatch',
                    'expected' => count($headers),
                    'actual' => count($values),
                    'line' => $lineIndex + 2, // 1-indexed; +1 to account for the header row
                ]);
            }
        }

        return $result;
    }
}
