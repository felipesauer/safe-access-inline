<?php

declare(strict_types=1);

namespace SafeAccessInline\Accessors;

use SafeAccessInline\Core\AbstractAccessor;
use SafeAccessInline\Exceptions\InvalidFormatException;

/**
 * Accessor for INI strings.
 * Uses PHP's native parse_ini_string with section and type support.
 */
class IniAccessor extends AbstractAccessor
{
    /**
     * Creates an IniAccessor from an INI-formatted string.
     *
     * @param  mixed $data     INI string to parse.
     * @param  bool  $readonly Whether the accessor should be immutable.
     * @return static
     *
     * @throws InvalidFormatException If $data is not a string.
     */
    public static function from(mixed $data, bool $readonly = false): static
    {
        if (!is_string($data)) {
            throw new InvalidFormatException(
                'IniAccessor expects an INI string, got ' . gettype($data)
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
        set_error_handler(fn () => true);

        $parsed = parse_ini_string($raw, true, INI_SCANNER_TYPED);

        restore_error_handler();
        if ($parsed === false) {
            throw new InvalidFormatException('IniAccessor failed to parse INI string.');
        }

        return $parsed;
    }
}
