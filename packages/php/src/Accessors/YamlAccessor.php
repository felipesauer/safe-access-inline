<?php

namespace SafeAccessInline\Accessors;

use SafeAccessInline\Core\AbstractAccessor;
use SafeAccessInline\Core\PluginRegistry;
use SafeAccessInline\Exceptions\InvalidFormatException;

/**
 * Accessor for YAML strings.
 *
 * Requires a YAML parser plugin to be registered via PluginRegistry.
 * This decouples the Accessor from any specific YAML library.
 *
 * @example
 * // Register at app startup:
 * PluginRegistry::registerParser('yaml', new SymfonyYamlParser());
 *
 * // Then use:
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

        if (!PluginRegistry::hasParser('yaml')) {
            throw new InvalidFormatException(
                'YamlAccessor requires a YAML parser plugin. '
                . "Register one with: PluginRegistry::registerParser('yaml', new YourYamlParser()). "
                . 'Example with symfony/yaml: new SymfonyYamlParser()'
            );
        }

        return new static($data); // @phpstan-ignore new.static
    }

    protected function parse(mixed $raw): array
    {
        assert(is_string($raw));

        return PluginRegistry::getParser('yaml')->parse($raw);
    }
}
