<?php

declare(strict_types=1);

namespace SafeAccessInline\Plugins;

use SafeAccessInline\Contracts\SerializerPluginInterface;

/**
 * YAML serializer plugin using PHP's native ext-yaml.
 *
 * Unlike other shipped plugins, this plugin retains an isAvailable() check because
 * ext-yaml is an optional PECL extension, not a Composer dependency.
 *
 * Requires: ext-yaml (pecl install yaml)
 *
 * @example
 * use SafeAccessInline\Core\PluginRegistry;
 * use SafeAccessInline\Plugins\NativeYamlSerializer;
 *
 * PluginRegistry::registerSerializer('yaml', new NativeYamlSerializer());
 */
class NativeYamlSerializer extends AbstractPlugin implements SerializerPluginInterface
{
    protected function isAvailable(): bool
    {
        return function_exists('yaml_emit');
    }

    protected function installHint(): string
    {
        return 'ext-yaml is not installed. Run: pecl install yaml';
    }

    /**
     * Serializes an associative array into a YAML string using ext-yaml.
     *
     * @param  array<string, mixed> $data Data to serialize.
     * @return string YAML-encoded string.
     *
     * @throws \RuntimeException If ext-yaml is not installed.
     */
    public function serialize(array $data): string
    {
        $this->assertAvailable();

        return yaml_emit($data);
    }
}
