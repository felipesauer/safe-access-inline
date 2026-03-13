<?php

namespace SafeAccessInline\Accessors;

use SafeAccessInline\Core\AbstractAccessor;
use SafeAccessInline\Exceptions\InvalidFormatException;

/**
 * Accessor for INI strings.
 * Uses PHP's native parse_ini_string with section and type support.
 */
class IniAccessor extends AbstractAccessor
{
    public static function from(mixed $data): static
    {
        if (!is_string($data)) {
            throw new InvalidFormatException(
                'IniAccessor expects an INI string, got ' . gettype($data)
            );
        }
        return new static($data); // @phpstan-ignore new.static
    }

    protected function parse(mixed $raw): array
    {
        assert(is_string($raw));
        set_error_handler(fn () => true);
        $parsed = parse_ini_string($raw, true, INI_SCANNER_TYPED);
        restore_error_handler();
        if ($parsed === false) {
            throw new InvalidFormatException('IniAccessor failed to parse INI string.');
        }
        return $parsed;
    }
}
