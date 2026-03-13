<?php

namespace SafeAccessInline\Plugins;

use SafeAccessInline\Contracts\ParserPluginInterface;

/**
 * TOML parser plugin using devium/toml.
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
        $decoded = \Devium\Toml\Toml::decode($raw);
        $json = json_encode($decoded);

        return (array) json_decode($json !== false ? $json : '{}', true);
    }
}
