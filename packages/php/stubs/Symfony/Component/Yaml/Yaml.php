<?php

declare(strict_types=1);

namespace Symfony\Component\Yaml;

/**
 * PHPStan stub for the optional symfony/yaml package.
 *
 * This file is never executed; it exists solely to give PHPStan
 * enough type information to analyse call sites when the package
 * is not installed (e.g. the "core" CI matrix).
 */
class Yaml
{
    /** Throw an exception when an invalid type is encountered during parsing. */
    public const int PARSE_EXCEPTION_ON_INVALID_TYPE = 1;

    /**
     * Parses a YAML string into a PHP value.
     *
     * @param  string $input YAML string to parse.
     * @param  int    $flags Bitmask of PARSE_* options.
     * @return mixed         Parsed PHP value.
     */
    public static function parse(string $input, int $flags = 0): mixed
    {
    }

    /**
     * Dumps a PHP value to a YAML string.
     *
     * @param  mixed  $input  Data to dump.
     * @param  int    $inline The level where to switch to inline YAML.
     * @param  int    $indent The number of spaces to use for indentation.
     * @param  int    $flags  Bitmask of DUMP_* options.
     * @return string         YAML-encoded string.
     */
    public static function dump(mixed $input, int $inline = 2, int $indent = 4, int $flags = 0): string
    {
    }
}
