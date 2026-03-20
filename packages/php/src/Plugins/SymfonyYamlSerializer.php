<?php

declare(strict_types=1);

namespace SafeAccessInline\Plugins;

use SafeAccessInline\Contracts\SerializerPluginInterface;

/**
 * YAML serializer plugin using symfony/yaml.
 *
 * @example
 * use SafeAccessInline\Core\Registries\PluginRegistry;
 * use SafeAccessInline\Plugins\SymfonyYamlSerializer;
 *
 * PluginRegistry::registerSerializer('yaml', new SymfonyYamlSerializer());
 */
class SymfonyYamlSerializer extends AbstractPlugin implements SerializerPluginInterface
{
    /**
     * @param int $inline Maximum nesting level for inline YAML notation.
     * @param int $indent Number of spaces per indentation level.
     */
    public function __construct(
        private int $inline = 4,
        private int $indent = 2,
    ) {
    }

    /**
     * Returns true when the symfony/yaml package is installed.
     *
     * @return bool Whether the dependency is available at runtime.
     */
    protected function isAvailable(): bool
    {
        return class_exists(\Symfony\Component\Yaml\Yaml::class);
    }

    /**
     * Returns an installation hint for symfony/yaml.
     *
     * @return string Human-readable install instructions.
     */
    protected function installHint(): string
    {
        return 'symfony/yaml is not installed. Run: composer require symfony/yaml';
    }

    /**
     * Serializes an associative array into a YAML string using symfony/yaml.
     *
     * @param  array<string, mixed> $data Data to serialize.
     * @return string YAML-encoded string.
     *
     * @throws \RuntimeException If symfony/yaml is not installed.
     */
    public function serialize(array $data): string
    {
        $this->assertAvailable();

        return \Symfony\Component\Yaml\Yaml::dump($data, $this->inline, $this->indent);
    }
}
