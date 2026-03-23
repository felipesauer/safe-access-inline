<?php

declare(strict_types=1);

namespace SafeAccessInline\Accessors;

use Devium\Toml\Toml;
use SafeAccessInline\Core\AbstractAccessor;
use SafeAccessInline\Core\Registries\PluginRegistry;
use SafeAccessInline\Exceptions\InvalidFormatException;

/**
 * Accessor for TOML strings.
 * Uses devium/toml by default, with optional plugin override via PluginRegistry.
 *
 * @example
 * SafeAccess::fromToml($tomlString)->get('database.host');
 * @extends AbstractAccessor<array<mixed>>
 */
class TomlAccessor extends AbstractAccessor
{
    /**
     * Creates a TomlAccessor from a TOML-encoded string.
     *
     * @param  mixed $data     TOML string to parse.
     * @param  bool  $readonly Whether the accessor should be immutable.
     * @return static
     *
     * @throws InvalidFormatException If $data is not a string.
     */
    public static function from(mixed $data, bool $readonly = false): static
    {
        if (!is_string($data)) {
            throw new InvalidFormatException(
                'TomlAccessor expects a TOML string, got ' . gettype($data)
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

        if (PluginRegistry::hasParser('toml')) {
            return PluginRegistry::getParser('toml')->parse($raw);
        }

        try {
            if (!$this->hasTomlLibrary()) {
                throw new InvalidFormatException(
                    'TOML support requires devium/toml. Install it via: composer require devium/toml'
                );
            }
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

    /**
     * Returns true when the devium/toml library is available; extracted so tests can override.
     * @return bool
     */
    protected function hasTomlLibrary(): bool
    {
        return class_exists(Toml::class);
    }
}
