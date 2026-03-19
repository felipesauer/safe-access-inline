<?php

declare(strict_types=1);

namespace Devium\Toml;

/**
 * PHPStan stub for the optional devium/toml package.
 *
 * This file is never executed; it exists solely to give PHPStan
 * enough type information to analyse call sites when the package
 * is not installed (e.g. the "core" CI matrix).
 */
class Toml
{
    /**
     * Decodes a TOML-encoded string into a PHP value.
     *
     * @param  string $toml TOML-encoded string.
     * @return mixed        Decoded PHP value (typically an object).
     */
    public static function decode(string $toml): mixed
    {
    }

    /**
     * Encodes a PHP value into a TOML string.
     *
     * @param  mixed  $data Data to encode.
     * @return string       TOML-encoded string.
     */
    public static function encode(mixed $data): string
    {
    }
}
