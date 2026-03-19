<?php

declare(strict_types=1);

namespace SafeAccessInline\Plugins;

use SafeAccessInline\Contracts\ParserPluginInterface;

/**
 * YAML parser plugin using PHP's native ext-yaml.
 *
 * Requires: ext-yaml (pecl install yaml)
 *
 * @example
 * use SafeAccessInline\Core\Registries\PluginRegistry;
 * use SafeAccessInline\Plugins\NativeYamlParser;
 *
 * PluginRegistry::registerParser('yaml', new NativeYamlParser());
 */
class NativeYamlParser extends AbstractPlugin implements ParserPluginInterface
{
    protected function isAvailable(): bool
    {
        return function_exists('yaml_parse');
    }

    protected function installHint(): string
    {
        return 'ext-yaml is not installed. Run: pecl install yaml';
    }

    /**
     * Parses a YAML string into an associative array using ext-yaml.
     *
     * @param  string              $raw Raw YAML content.
     * @return array<string, mixed> Parsed data.
     *
     * @throws \RuntimeException If ext-yaml is not installed.
     */
    public function parse(string $raw): array
    {
        $this->assertAvailable();

        $parsed = yaml_parse($raw);

        return is_array($parsed) ? $parsed : [];
    }
}
