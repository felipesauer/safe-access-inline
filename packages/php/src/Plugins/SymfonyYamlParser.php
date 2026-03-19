<?php

declare(strict_types=1);

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
class SymfonyYamlParser extends AbstractPlugin implements ParserPluginInterface
{
    protected function isAvailable(): bool
    {
        return class_exists(\Symfony\Component\Yaml\Yaml::class);
    }

    protected function installHint(): string
    {
        return 'symfony/yaml is not installed. Run: composer require symfony/yaml';
    }

    /**
     * Parses a YAML string into an associative array using symfony/yaml.
     *
     * @param  string              $raw Raw YAML content.
     * @return array<string, mixed> Parsed data.
     *
     * @throws \RuntimeException If symfony/yaml is not installed.
     */
    public function parse(string $raw): array
    {
        $this->assertAvailable();

        $parsed = \Symfony\Component\Yaml\Yaml::parse($raw, \Symfony\Component\Yaml\Yaml::PARSE_EXCEPTION_ON_INVALID_TYPE);

        return is_array($parsed) ? $parsed : [];
    }
}
