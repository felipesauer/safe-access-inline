<?php

namespace SafeAccessInline\Plugins;

use SafeAccessInline\Contracts\ParserPluginInterface;
use SafeAccessInline\Exceptions\InvalidFormatException;

/**
 * TOML parser plugin using devium/toml.
 *
 * Requires: composer require devium/toml
 *
 * @example
 * use SafeAccessInline\Core\PluginRegistry;
 * use SafeAccessInline\Plugins\DeviumTomlParser;
 *
 * PluginRegistry::registerParser('toml', new DeviumTomlParser());
 */
class DeviumTomlParser implements ParserPluginInterface
{
    public function parse(string $raw): array
    {
        if (!class_exists(\Devium\Toml\Toml::class)) {
            throw new InvalidFormatException(
                'devium/toml is not installed. Run: composer require devium/toml'
            );
        }

        return \Devium\Toml\Toml::decode($raw);
    }
}
