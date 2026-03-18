<?php

namespace SafeAccessInline\Plugins;

use SafeAccessInline\Contracts\SerializerPluginInterface;
use SafeAccessInline\Exceptions\InvalidFormatException;

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
    protected function isAvailable(): bool
    {
        return class_exists(\Devium\Toml\Toml::class);
    }

    public function serialize(array $data): string
    {
        if (!$this->isAvailable()) {
            throw new InvalidFormatException(
                'devium/toml is not installed. Run: composer require devium/toml'
            );
        }

        /** @var array<string, mixed>|\stdClass */
        $tomlData = json_decode(json_encode($data) ?: '{}');

        return \Devium\Toml\Toml::encode($tomlData);
    }
}
