<?php

namespace SafeAccessInline\Security;

use SafeAccessInline\Exceptions\SecurityException;

final class CsvSanitizer
{
    private const DANGEROUS_PREFIXES = ['=', '+', '-', '@', "\t", "\r"];

    /**
     * @param 'prefix'|'strip'|'error'|'none' $mode
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
            'strip' => ltrim($cell, "=+-@\t\r"),
            'error' => throw new SecurityException(
                "CSV cell starts with dangerous character: '{$cell[0]}'"
            ),
            default => $cell,
        };
    }

    /**
     * @param string[] $row
     * @param 'prefix'|'strip'|'error'|'none' $mode
     * @return string[]
     */
    public static function sanitizeRow(array $row, string $mode = 'none'): array
    {
        return array_map(fn (string $cell) => self::sanitizeCell($cell, $mode), $row);
    }
}
