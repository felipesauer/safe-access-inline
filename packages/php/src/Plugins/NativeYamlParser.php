<?php

namespace SafeAccessInline\Plugins;

use SafeAccessInline\Contracts\ParserPluginInterface;
use SafeAccessInline\Exceptions\InvalidFormatException;

/**
 * YAML parser plugin using PHP's native ext-yaml.
 *
 * Requires: ext-yaml (pecl install yaml)
 *
 * @example
 * use SafeAccessInline\Core\PluginRegistry;
 * use SafeAccessInline\Plugins\NativeYamlParser;
 *
 * PluginRegistry::registerParser('yaml', new NativeYamlParser());
 */
class NativeYamlParser implements ParserPluginInterface
{
    public function parse(string $raw): array
    {
        if (!function_exists('yaml_parse')) {
            throw new InvalidFormatException(
                'ext-yaml is not installed. Run: pecl install yaml'
            );
        }

        $parsed = yaml_parse($raw);

        return is_array($parsed) ? $parsed : [];
    }
}
