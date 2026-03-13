<?php

namespace SafeAccessInline\Plugins;

use SafeAccessInline\Contracts\SerializerPluginInterface;

/**
 * YAML serializer plugin using symfony/yaml.
 *
 * @example
 * use SafeAccessInline\Core\PluginRegistry;
 * use SafeAccessInline\Plugins\SymfonyYamlSerializer;
 *
 * PluginRegistry::registerSerializer('yaml', new SymfonyYamlSerializer());
 */
class SymfonyYamlSerializer implements SerializerPluginInterface
{
    public function __construct(
        private int $inline = 4,
        private int $indent = 2,
    ) {
    }

    public function serialize(array $data): string
    {
        return \Symfony\Component\Yaml\Yaml::dump($data, $this->inline, $this->indent);
    }
}
