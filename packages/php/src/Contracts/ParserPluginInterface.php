<?php

namespace SafeAccessInline\Contracts;

/**
 * Contract for parser plugins.
 * A parser converts raw input (string) into an associative array.
 *
 * Used by Accessors that depend on external libraries (YAML, TOML, etc.)
 * to decouple the parsing logic from the Accessor itself.
 */
interface ParserPluginInterface
{
    /**
     * Parse raw string input into an associative array.
     *
     * @param string $raw Raw input string
     * @return array<mixed> Parsed data as associative array
     * @throws \SafeAccessInline\Exceptions\InvalidFormatException
     */
    public function parse(string $raw): array;
}
