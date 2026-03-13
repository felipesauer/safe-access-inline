<?php

namespace SafeAccessInline\Accessors;

use SafeAccessInline\Core\AbstractAccessor;
use SafeAccessInline\Core\PluginRegistry;
use SafeAccessInline\Exceptions\InvalidFormatException;
use Symfony\Component\Yaml\Yaml;

/**
 * Accessor for YAML strings.
 * Uses ext-yaml (if available) or symfony/yaml by default, with optional plugin override via PluginRegistry.
 *
 * @example
 * SafeAccess::fromYaml($yamlString)->get('database.host');
 */
class YamlAccessor extends AbstractAccessor
{
    public static function from(mixed $data): static
    {
        if (!is_string($data)) {
            throw new InvalidFormatException(
                'YamlAccessor expects a YAML string, got ' . gettype($data)
            );
        }

        return new static($data); // @phpstan-ignore new.static
    }

    protected function parse(mixed $raw): array
    {
        assert(is_string($raw));

        if (PluginRegistry::hasParser('yaml')) {
            return PluginRegistry::getParser('yaml')->parse($raw);
        }

        try {
            if ($this->hasNativeYamlParse()) {
                $parsed = yaml_parse($raw);
                return is_array($parsed) ? $parsed : [];
            }

            $parsed = Yaml::parse($raw);
            return is_array($parsed) ? $parsed : [];
        } catch (\Throwable $e) {
            throw new InvalidFormatException(
                'YamlAccessor failed to parse YAML string: ' . $e->getMessage(),
                previous: $e,
            );
        }
    }

    protected function hasNativeYamlParse(): bool
    {
        return function_exists('yaml_parse');
    }
}
