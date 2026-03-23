<?php

declare(strict_types=1);

namespace SafeAccessInline\Security\Sanitizers;

use SafeAccessInline\Exceptions\SecurityException;

/** Sanitises CSV cell values to prevent formula-injection attacks (OWASP). */
final class CsvSanitizer
{
    private const DANGEROUS_PREFIXES = ['=', '+', '-', '@', "\t", "\r", "\n"];

    /**
     * Sanitises a single CSV cell to prevent formula injection.
     *
     * @param string $cell The raw cell value.
     * @param 'prefix'|'strip'|'error'|'none' $mode Sanitisation strategy.
     * @return string The sanitised cell.
     * @throws SecurityException When mode is 'error' and the cell starts with a dangerous character.
     */
    public static function sanitizeCell(string $cell, string $mode = 'none'): string
    {
        if ($mode === 'none') {
            return $cell;
        }

        $isDangerous = false;
        foreach (self::DANGEROUS_PREFIXES as $prefix) {
            if (str_starts_with($cell, $prefix)) {
                $isDangerous = true;
                break;
            }
        }

        if (!$isDangerous) {
            return $cell;
        }

        return match ($mode) {
            'prefix' => "'" . $cell,
            'strip' => ltrim($cell, "=+-@\t\r\n"),
            /** @phpstan-ignore match.alwaysTrue */
            'error' => throw new SecurityException(
                "CSV cell starts with dangerous character: '{$cell[0]}'"
            ),
            default => $cell,
        };
    }

    /**
     * Sanitises every cell in a CSV row.
     *
     * @param string[] $row Array of raw cell values.
     * @param 'prefix'|'strip'|'error'|'none' $mode Sanitisation strategy.
     * @return string[] Array of sanitised cell strings.
     */
    public static function sanitizeRow(array $row, string $mode = 'none'): array
    {
        return array_map(fn (string $cell) => self::sanitizeCell($cell, $mode), $row);
    }

    /**
     * Sanitises CSV header names to prevent formula injection via column names.
     *
     * Header names are typically developer-controlled but may originate from
     * untrusted sources (e.g. user-uploaded files). Applying the same
     * sanitisation strategy as data rows ensures consistency and prevents
     * CSV injection payloads from hiding in column headers.
     *
     * @param string[] $headers Array of raw header strings.
     * @param 'prefix'|'strip'|'error'|'none' $mode Sanitisation strategy.
     * @return string[] Array of sanitised header strings.
     * @throws SecurityException When mode is 'error' and a header starts with a dangerous character.
     */
    public static function sanitizeHeaders(array $headers, string $mode = 'none'): array
    {
        return array_map(fn (string $header) => self::sanitizeCell($header, $mode), $headers);
    }
}
