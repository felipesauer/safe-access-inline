<?php

namespace SafeAccessInline\Accessors;

use SafeAccessInline\Core\AbstractAccessor;
use SafeAccessInline\Core\PluginRegistry;
use SafeAccessInline\Exceptions\InvalidFormatException;

/**
 * Accessor for TOML strings.
 *
 * Requires a TOML parser plugin to be registered via PluginRegistry.
 *
 * @example
 * PluginRegistry::registerParser('toml', new DeviumTomlParser());
 * SafeAccess::fromToml($tomlString)->get('database.host');
 */
class TomlAccessor extends AbstractAccessor
{
    public static function from(mixed $data): static
    {
        if (!is_string($data)) {
            throw new InvalidFormatException(
                'TomlAccessor expects a TOML string, got ' . gettype($data)
            );
        }

        if (!PluginRegistry::hasParser('toml')) {
            throw new InvalidFormatException(
                'TomlAccessor requires a TOML parser plugin. '
                . "Register one with: PluginRegistry::registerParser('toml', new YourTomlParser()). "
                . 'Example with devium/toml: new DeviumTomlParser()'
            );
        }

        return new static($data); // @phpstan-ignore new.static
    }

    protected function parse(mixed $raw): array
    {
        assert(is_string($raw));

        return PluginRegistry::getParser('toml')->parse($raw);
    }
}
