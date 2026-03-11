<?php

namespace SafeAccessInline\Accessors;

use SafeAccessInline\Core\AbstractAccessor;
use SafeAccessInline\Exceptions\InvalidFormatException;

/**
 * Accessor for .env format strings (KEY=VALUE per line).
 * Supports: comments (#), quotes, blank lines.
 *
 * Example:
 *   "APP_KEY=secret\nDEBUG=true\n# comment" → ['APP_KEY' => 'secret', 'DEBUG' => 'true']
 */
class EnvAccessor extends AbstractAccessor
{
    public static function from(mixed $data): static
    {
        if (!is_string($data)) {
            throw new InvalidFormatException(
                'EnvAccessor expects an ENV string, got ' . gettype($data)
            );
        }
        return new static($data); // @phpstan-ignore new.static
    }

    protected function parse(mixed $raw): array
    {
        assert(is_string($raw));
        $result = [];
        $lines = explode("\n", $raw);

        foreach ($lines as $line) {
            $line = trim($line);

            // Skip blank lines and comments
            if ($line === '' || str_starts_with($line, '#')) {
                continue;
            }

            $eqPos = strpos($line, '=');
            if ($eqPos === false) {
                continue;
            }

            $key = trim(substr($line, 0, $eqPos));
            $value = trim(substr($line, $eqPos + 1));

            // Strip surrounding quotes
            if (
                (str_starts_with($value, '"') && str_ends_with($value, '"')) ||
                (str_starts_with($value, "'") && str_ends_with($value, "'"))
            ) {
                $value = substr($value, 1, -1);
            }

            $result[$key] = $value;
        }

        return $result;
    }
}
