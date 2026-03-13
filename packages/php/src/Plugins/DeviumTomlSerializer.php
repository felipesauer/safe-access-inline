<?php

namespace SafeAccessInline\Plugins;

use SafeAccessInline\Contracts\SerializerPluginInterface;

/**
 * TOML serializer plugin using devium/toml.
 *
 * @example
 * use SafeAccessInline\Core\PluginRegistry;
 * use SafeAccessInline\Plugins\DeviumTomlSerializer;
 *
 * PluginRegistry::registerSerializer('toml', new DeviumTomlSerializer());
 */
class DeviumTomlSerializer implements SerializerPluginInterface
{
    public function serialize(array $data): string
    {
        /** @var array<string, mixed>|\stdClass */
        $tomlData = json_decode(json_encode($data) ?: '{}');

        return \Devium\Toml\Toml::encode($tomlData);
    }
}
