<?php

namespace SafeAccessInline\Plugins;

use SafeAccessInline\Contracts\SerializerPluginInterface;
use SafeAccessInline\Exceptions\InvalidFormatException;

/**
 * YAML serializer plugin using symfony/yaml.
 *
 * Requires: composer require symfony/yaml
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
    ) {}

    protected function isAvailable(): bool
    {
        return class_exists(\Symfony\Component\Yaml\Yaml::class);
    }

    public function serialize(array $data): string
    {
        if (!$this->isAvailable()) {
            throw new InvalidFormatException(
                'symfony/yaml is not installed. Run: composer require symfony/yaml'
            );
        }

        return \Symfony\Component\Yaml\Yaml::dump($data, $this->inline, $this->indent); // @codeCoverageIgnore
    }
}
