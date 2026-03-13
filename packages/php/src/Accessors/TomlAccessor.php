<?php

namespace SafeAccessInline\Accessors;

use Devium\Toml\Toml;
use SafeAccessInline\Core\AbstractAccessor;
use SafeAccessInline\Core\PluginRegistry;
use SafeAccessInline\Exceptions\InvalidFormatException;

/**
 * Accessor for TOML strings.
 * Uses devium/toml by default, with optional plugin override via PluginRegistry.
 *
 * @example
 * SafeAccess::fromToml($tomlString)->get('database.host');
 */
class TomlAccessor extends AbstractAccessor
{
    public static function from(mixed $data): static
    {
        if (!is_string($data)) {
            throw new InvalidFormatException(
                'TomlAccessor expects a TOML string, got ' . gettype($data)
            );
        }

        return new static($data); // @phpstan-ignore new.static
    }

    protected function parse(mixed $raw): array
    {
        assert(is_string($raw));

        if (PluginRegistry::hasParser('toml')) {
            return PluginRegistry::getParser('toml')->parse($raw);
        }

        try {
            $decoded = Toml::decode($raw);
            $json = json_encode($decoded);

            return (array) json_decode($json !== false ? $json : '{}', true);
        } catch (\Throwable $e) {
            throw new InvalidFormatException(
                'TomlAccessor failed to parse TOML string: ' . $e->getMessage(),
                previous: $e,
            );
        }
    }
}
