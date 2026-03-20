<?php

declare(strict_types=1);

namespace SafeAccessInline\Accessors;

use SafeAccessInline\Core\AbstractAccessor;
use SafeAccessInline\Core\Registries\PluginRegistry;
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
    /**
     * Creates a YamlAccessor from a YAML-encoded string.
     *
     * @param  mixed $data     YAML string to parse.
     * @param  bool  $readonly Whether the accessor should be immutable.
     * @return static
     *
     * @throws InvalidFormatException If $data is not a string.
     */
    public static function from(mixed $data, bool $readonly = false): static
    {
        if (!is_string($data)) {
            throw new InvalidFormatException(
                'YamlAccessor expects a YAML string, got ' . gettype($data)
            );
        }

        return new static($data, $readonly); // @phpstan-ignore new.static
    }

    /**
     * @param mixed $raw
     * @return array<mixed>
     */
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

            if (!$this->hasSymfonyYaml()) {
                throw new InvalidFormatException(
                    'YAML support requires ext-yaml or symfony/yaml. Install via: composer require symfony/yaml'
                );
            }

            $parsed = Yaml::parse($raw, Yaml::PARSE_EXCEPTION_ON_INVALID_TYPE);
            return is_array($parsed) ? $parsed : [];
        } catch (\Throwable $e) {
            throw new InvalidFormatException(
                'YamlAccessor failed to parse YAML string: ' . $e->getMessage(),
                previous: $e,
            );
        }
    }

    /**
     * Returns true when ext-yaml is available; extracted so tests can override.
     * @return bool
     */
    protected function hasNativeYamlParse(): bool
    {
        return function_exists('yaml_parse');
    }

    /**
     * Returns true when Symfony YAML is available; extracted so tests can override.
     * @return bool
     */
    protected function hasSymfonyYaml(): bool
    {
        return class_exists(Yaml::class);
    }
}
