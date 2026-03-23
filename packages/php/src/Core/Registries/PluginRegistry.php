<?php

declare(strict_types=1);

namespace SafeAccessInline\Core\Registries;

use SafeAccessInline\Contracts\ParserPluginInterface;
use SafeAccessInline\Contracts\SerializerPluginInterface;
use SafeAccessInline\Core\Config\PluginRegistryConfig;
use SafeAccessInline\Exceptions\UnsupportedTypeException;
use SafeAccessInline\Security\Audit\AuditLogger;

/**
 * Central registry for parser and serializer plugins.
 *
 * Parsers are used by Accessors to convert raw input → array.
 * Serializers are used by toXml(), toYaml(), transform() to convert array → string.
 *
 * Built-in parsers (json, xml, ini, csv, env) are always available.
 * Optional parsers (yaml, toml) require registration via registerParser().
 *
 * **Long-running runtimes (Swoole, RoadRunner, FrankenPHP):** Static state persists
 * across requests. Call {@see PluginRegistry::reset()} in your worker boot/reset hook
 * to prevent stale plugin registrations leaking between requests.
 */
final class PluginRegistry
{
    /** Maximum number of distinct parser formats that can be registered. */
    private const MAX_PARSERS = PluginRegistryConfig::DEFAULT_MAX_PARSERS;

    /** Maximum number of distinct serializer formats that can be registered. */
    private const MAX_SERIALIZERS = PluginRegistryConfig::DEFAULT_MAX_SERIALIZERS;

    /** @var array<string, ParserPluginInterface> Map of format identifier to registered parser plugin. */
    private static array $parsers = [];

    /** @var array<string, SerializerPluginInterface> Map of format identifier to registered serializer plugin. */
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
        if (!isset(self::$parsers[$format]) && count(self::$parsers) >= self::MAX_PARSERS) {
            throw new \RangeException(
                sprintf(
                    'Max parser plugins (%d) reached. Call PluginRegistry::reset() to clear before registering new formats.',
                    self::MAX_PARSERS,
                )
            );
        }
        if (isset(self::$parsers[$format])) {
            AuditLogger::emit('plugin.overwrite', [
                'kind' => 'parser',
                'format' => $format,
                'message' => "Parser for format '{$format}' is being overwritten.",
            ]);
        }
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
        if (!isset(self::$serializers[$format]) && count(self::$serializers) >= self::MAX_SERIALIZERS) {
            throw new \RangeException(
                sprintf(
                    'Max serializer plugins (%d) reached. Call PluginRegistry::reset() to clear before registering new formats.',
                    self::MAX_SERIALIZERS,
                )
            );
        }
        if (isset(self::$serializers[$format])) {
            AuditLogger::emit('plugin.overwrite', [
                'kind' => 'serializer',
                'format' => $format,
                'message' => "Serializer for format '{$format}' is being overwritten.",
            ]);
        }
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
