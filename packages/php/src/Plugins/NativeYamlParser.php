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
    /**
     * Returns true when the ext-yaml PHP extension is available.
     *
     * @return bool Whether `yaml_parse` is available at runtime.
     */
    protected function isAvailable(): bool
    {
        return function_exists('yaml_parse');
    }

    /**
     * Returns an installation hint for ext-yaml.
     *
     * @return string Human-readable install instructions.
     */
    protected function installHint(): string
    {
        return 'ext-yaml is not installed. Run: pecl install yaml';
    }

    /**
     * Parses a YAML string into an associative array using ext-yaml.
     *
     * Dangerous YAML tags are blocked via the callbacks parameter.
     * Blocked tags include PHP-specific deserialization vectors (`!!php/object`,
     * `!!php/const`, `!!php/constant`), JavaScript execution vectors
     * (`!!js/function`, `!!js/regexp`), Python execution vectors
     * (`!!python/object`, `!!python/object/apply`, `!!python/object/new`),
     * and generic `!!binary` (base64 bomb vector).
     * Encountering any of these tags throws a {@see \RuntimeException} so
     * that attacker-controlled YAML cannot instantiate arbitrary objects
     * or execute code.
     *
     * @param  string              $raw Raw YAML content.
     * @return array<string, mixed> Parsed data.
     *
     * @throws \RuntimeException If ext-yaml is not installed or a dangerous tag is encountered.
     */
    public function parse(string $raw): array
    {
        $this->assertAvailable();

        $blocked = static function (): never {
            throw new \RuntimeException('Dangerous YAML tag is not permitted.');
        };

        /** @var int $ndocs */
        $ndocs = 0;
        $parsed = yaml_parse($raw, 0, $ndocs, [
            '!!php/object'              => $blocked,
            '!!php/const'               => $blocked,
            '!!php/constant'            => $blocked,
            '!!js/function'             => $blocked,
            '!!js/regexp'               => $blocked,
            '!!python/object'           => $blocked,
            '!!python/object/apply'     => $blocked,
            '!!python/object/new'       => $blocked,
            '!!binary'                  => $blocked,
        ]);

        return is_array($parsed) ? $parsed : [];
    }
}
