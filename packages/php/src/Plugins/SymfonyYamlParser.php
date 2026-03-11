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
    public function parse(string $raw): array
    {
        if (!class_exists(\Symfony\Component\Yaml\Yaml::class)) {
            throw new InvalidFormatException(
                'symfony/yaml is not installed. Run: composer require symfony/yaml'
            );
        }

        $parsed = \Symfony\Component\Yaml\Yaml::parse($raw);

        return is_array($parsed) ? $parsed : [];
    }
}
