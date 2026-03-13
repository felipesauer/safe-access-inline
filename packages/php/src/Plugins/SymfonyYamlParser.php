<?php

namespace SafeAccessInline\Plugins;

use SafeAccessInline\Contracts\ParserPluginInterface;

/**
 * YAML parser plugin using symfony/yaml.
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
        $parsed = \Symfony\Component\Yaml\Yaml::parse($raw);

        return is_array($parsed) ? $parsed : [];
    }
}
