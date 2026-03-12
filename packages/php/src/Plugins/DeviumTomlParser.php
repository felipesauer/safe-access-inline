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
    protected function isAvailable(): bool
    {
        return class_exists(\Devium\Toml\Toml::class);
    }

    public function parse(string $raw): array
    {
        if (!$this->isAvailable()) {
            throw new InvalidFormatException(
                'devium/toml is not installed. Run: composer require devium/toml'
            );
        }

        return (array) \Devium\Toml\Toml::decode($raw); // @codeCoverageIgnore
    }
}
