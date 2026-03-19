<?php

declare(strict_types=1);

namespace SafeAccessInline\Plugins;

use SafeAccessInline\Contracts\SerializerPluginInterface;

/**
 * TOML serializer plugin using devium/toml.
 *
 * @example
 * use SafeAccessInline\Core\Registries\PluginRegistry;
 * use SafeAccessInline\Plugins\DeviumTomlSerializer;
 *
 * PluginRegistry::registerSerializer('toml', new DeviumTomlSerializer());
 */
class DeviumTomlSerializer extends AbstractPlugin implements SerializerPluginInterface
{
    protected function isAvailable(): bool
    {
        return class_exists(\Devium\Toml\Toml::class);
    }

    protected function installHint(): string
    {
        return 'devium/toml is not installed. Run: composer require devium/toml';
    }

    /**
     * Serializes an associative array into a TOML string using devium/toml.
     *
     * @param  array<string, mixed> $data Data to serialize.
     * @return string TOML-encoded string.
     *
     * @throws \RuntimeException If devium/toml is not installed.
     */
    public function serialize(array $data): string
    {
        $this->assertAvailable();

        /** @var array<string, mixed>|\stdClass */
        $tomlData = json_decode(json_encode($data) ?: '{}');

        return \Devium\Toml\Toml::encode($tomlData);
    }
}
