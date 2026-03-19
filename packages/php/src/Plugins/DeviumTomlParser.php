<?php

declare(strict_types=1);

namespace SafeAccessInline\Plugins;

use SafeAccessInline\Contracts\ParserPluginInterface;

/**
 * TOML parser plugin using devium/toml.
 *
 * @example
 * use SafeAccessInline\Core\Registries\PluginRegistry;
 * use SafeAccessInline\Plugins\DeviumTomlParser;
 *
 * PluginRegistry::registerParser('toml', new DeviumTomlParser());
 */
class DeviumTomlParser extends AbstractPlugin implements ParserPluginInterface
{
    protected function isAvailable(): bool
    {
        return class_exists(\Devium\Toml\Toml::class);
    }

    protected function installHint(): string
    {
        return 'devium/toml is not installed. Run: composer require devium/toml';
    }

    /**
     * Parses a TOML string into an associative array using devium/toml.
     *
     * @param  string              $raw Raw TOML content.
     * @return array<string, mixed> Parsed data.
     *
     * @throws \RuntimeException If devium/toml is not installed.
     */
    public function parse(string $raw): array
    {
        $this->assertAvailable();

        $decoded = \Devium\Toml\Toml::decode($raw);
        $json = json_encode($decoded);

        /** @var array<mixed, mixed> $raw */
        $raw = (array) json_decode($json !== false ? $json : '{}', true);

        /** @var array<string, mixed> $result */
        $result = array_combine(
            array_map(static fn (mixed $k): string => (string) $k, array_keys($raw)),
            array_values($raw),
        );

        return $result;
    }
}
