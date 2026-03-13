<?php

namespace SafeAccessInline\Plugins;

use SafeAccessInline\Contracts\SerializerPluginInterface;
use SafeAccessInline\Exceptions\InvalidFormatException;

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
class NativeYamlSerializer implements SerializerPluginInterface
{
    protected function isAvailable(): bool
    {
        return function_exists('yaml_emit');
    }

    public function serialize(array $data): string
    {
        if (!$this->isAvailable()) {
            throw new InvalidFormatException(
                'ext-yaml is not installed. Run: pecl install yaml'
            );
        }

        return yaml_emit($data);
    }
}
