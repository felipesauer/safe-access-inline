<?php

namespace SafeAccessInline\Plugins;

use SafeAccessInline\Contracts\ParserPluginInterface;
use SafeAccessInline\Exceptions\InvalidFormatException;

/**
 * YAML parser plugin using symfony/yaml.
 *
 * Requires: composer require symfony/yaml
 *
 * @example
 * use SafeAccessInline\Core\PluginRegistry;
 * use SafeAccessInline\Plugins\SymfonyYamlParser;
 *
 * PluginRegistry::registerParser('yaml', new SymfonyYamlParser());
 */
class SymfonyYamlParser implements ParserPluginInterface
{
    protected function isAvailable(): bool
    {
        return class_exists(\Symfony\Component\Yaml\Yaml::class);
    }

    public function parse(string $raw): array
    {
        if (!$this->isAvailable()) {
            throw new InvalidFormatException(
                'symfony/yaml is not installed. Run: composer require symfony/yaml'
            );
        }

        $parsed = \Symfony\Component\Yaml\Yaml::parse($raw); // @codeCoverageIgnore

        return is_array($parsed) ? $parsed : []; // @codeCoverageIgnore
    }
}
