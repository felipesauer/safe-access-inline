<?php

namespace SafeAccessInline\Core;

use SafeAccessInline\Contracts\ParserPluginInterface;
use SafeAccessInline\Contracts\SerializerPluginInterface;
use SafeAccessInline\Exceptions\UnsupportedTypeException;

/**
 * Central registry for parser and serializer plugins.
 *
 * Parsers are used by Accessors to convert raw input → array.
 * Serializers are used by toXml(), toYaml(), transform() to convert array → string.
 *
 * Built-in parsers (json, xml, ini, csv, env) are always available.
 * Optional parsers (yaml, toml) require registration via registerParser().
 */
final class PluginRegistry
{
    /** @var array<string, ParserPluginInterface> */
    private static array $parsers = [];

    /** @var array<string, SerializerPluginInterface> */
    private static array $serializers = [];

    // ── Parser Registration ────────────────────────

    /**
     * Register a parser plugin for a given format.
     *
     * @param string $format Format identifier (e.g., 'yaml', 'toml')
     * @param ParserPluginInterface $parser Parser implementation
     */
    public static function registerParser(string $format, ParserPluginInterface $parser): void
    {
        self::$parsers[$format] = $parser;
    }

    /**
     * Check if a parser is registered for the given format.
     */
    public static function hasParser(string $format): bool
    {
        return isset(self::$parsers[$format]);
    }

    /**
     * Get a registered parser. Throws if not registered.
     *
     * @throws UnsupportedTypeException
     */
    public static function getParser(string $format): ParserPluginInterface
    {
        if (!isset(self::$parsers[$format])) {
            throw new UnsupportedTypeException(
                "No parser registered for format '{$format}'. "
                . "Register one with: PluginRegistry::registerParser('{$format}', new YourParser())"
            );
        }

        return self::$parsers[$format];
    }

    // ── Serializer Registration ────────────────────

    /**
     * Register a serializer plugin for a given format.
     *
     * @param string $format Format identifier (e.g., 'xml', 'yaml')
     * @param SerializerPluginInterface $serializer Serializer implementation
     */
    public static function registerSerializer(string $format, SerializerPluginInterface $serializer): void
    {
        self::$serializers[$format] = $serializer;
    }

    /**
     * Check if a serializer is registered for the given format.
     */
    public static function hasSerializer(string $format): bool
    {
        return isset(self::$serializers[$format]);
    }

    /**
     * Get a registered serializer. Throws if not registered.
     *
     * @throws UnsupportedTypeException
     */
    public static function getSerializer(string $format): SerializerPluginInterface
    {
        if (!isset(self::$serializers[$format])) {
            throw new UnsupportedTypeException(
                "No serializer registered for format '{$format}'. "
                . "Register one with: PluginRegistry::registerSerializer('{$format}', new YourSerializer())"
            );
        }

        return self::$serializers[$format];
    }

    // ── Reset (for testing) ─────────────────────────

    /**
     * Clear all registered plugins. Intended for use in tests only.
     *
     * @internal
     */
    public static function reset(): void
    {
        self::$parsers = [];
        self::$serializers = [];
    }
}
