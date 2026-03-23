<?php

declare(strict_types=1);

namespace SafeAccessInline\Plugins;

use SafeAccessInline\Contracts\ParserPluginInterface;

/**
 * YAML parser plugin using symfony/yaml.
 *
 * @example
 * use SafeAccessInline\Core\Registries\PluginRegistry;
 * use SafeAccessInline\Plugins\SymfonyYamlParser;
 *
 * PluginRegistry::registerParser('yaml', new SymfonyYamlParser());
 */
class SymfonyYamlParser extends AbstractPlugin implements ParserPluginInterface
{
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
     * Parses a YAML string into an associative array using symfony/yaml.
     *
     * The {@see \Symfony\Component\Yaml\Yaml::PARSE_EXCEPTION_ON_INVALID_TYPE} flag
     * causes symfony/yaml to throw a {@see \Symfony\Component\Yaml\Exception\ParseException}
     * for unsafe PHP-specific tags such as `!php/object:ClassName`, preventing
     * arbitrary PHP object deserialization. The exception is caught here and
     * re-thrown as a `\RuntimeException` so callers receive a consistent
     * domain-level error.
     *
     * @param  string              $raw Raw YAML content.
     * @return array<string, mixed> Parsed data.
     *
     * @throws \RuntimeException If symfony/yaml is not installed or a dangerous/invalid type is encountered.
     */
    public function parse(string $raw): array
    {
        $this->assertAvailable();

        try {
            $parsed = \Symfony\Component\Yaml\Yaml::parse(
                $raw,
                \Symfony\Component\Yaml\Yaml::PARSE_EXCEPTION_ON_INVALID_TYPE,
            );
        } catch (\Symfony\Component\Yaml\Exception\ParseException $e) {
            throw new \RuntimeException(
                'YAML parsing failed (dangerous or invalid type encountered): ' . $e->getMessage(),
                0,
                $e,
            );
        }

        return is_array($parsed) ? $parsed : [];
    }
}
