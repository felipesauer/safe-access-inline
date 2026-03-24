<?php

declare(strict_types=1);

namespace SafeAccessInline\Core\Registries;

use SafeAccessInline\Contracts\ParserPluginInterface;
use SafeAccessInline\Contracts\PluginRegistryInterface;
use SafeAccessInline\Contracts\SerializerPluginInterface;
use SafeAccessInline\Exceptions\UnsupportedTypeException;

/**
 * Central registry for parser and serializer plugins.
 *
 * Parsers are used by Accessors to convert raw input → array.
 * Serializers are used by toXml(), toYaml(), transform() to convert array → string.
 *
 * Built-in parsers (json, xml, ini, env) are always available.
 * Optional parsers (yaml, toml) require registration via registerParser().
 *
 * All static methods delegate to a shared module-level default instance.
 * For test isolation or DI, use {@see PluginRegistry::create()} to obtain
 * a fresh {@see PluginRegistryInterface} instance that is fully independent.
 *
 * **Long-running runtimes (Swoole, RoadRunner, FrankenPHP):** Static state persists
 * across requests. Call {@see PluginRegistry::reset()} in your worker boot/reset hook
 * to prevent stale plugin registrations leaking between requests.
 */
final class PluginRegistry
{
    /** Default instance backing all static facade methods. */
    private static ?PluginRegistryInterface $default = null;

    // ── Factory & DI ────────────────────────────────

    /**
     * Creates a new, isolated plugin registry instance.
     *
     * Use this in tests or DI contexts where you need a scope that is completely
     * independent of the global default registry.
     *
     * @return PluginRegistryInterface A fresh, empty registry instance.
     */
    public static function create(): PluginRegistryInterface
    {
        return new PluginRegistryImpl();
    }

    /**
     * Returns the global default registry instance backing all static methods.
     *
     * Prefer the static convenience methods for most use-cases; use `getDefault()`
     * only when you need to pass the registry as a {@see PluginRegistryInterface} reference.
     *
     * @return PluginRegistryInterface The shared module-level instance.
     */
    public static function getDefault(): PluginRegistryInterface
    {
        return self::$default ??= new PluginRegistryImpl();
    }

    // ── Static Facade (backward-compatible API) ──────

    /**
     * Register a parser plugin for a given format.
     *
     * @param string $format Format identifier (e.g., 'yaml', 'toml')
     * @param ParserPluginInterface $parser Parser implementation
     */
    public static function registerParser(string $format, ParserPluginInterface $parser): void
    {
        self::getDefault()->registerParser($format, $parser);
    }

    /**
     * Check if a parser is registered for the given format.
     */
    public static function hasParser(string $format): bool
    {
        return self::getDefault()->hasParser($format);
    }

    /**
     * Get a registered parser. Throws if not registered.
     *
     * @throws UnsupportedTypeException
     */
    public static function getParser(string $format): ParserPluginInterface
    {
        return self::getDefault()->getParser($format);
    }

    /**
     * Register a serializer plugin for a given format.
     *
     * @param string $format Format identifier (e.g., 'xml', 'yaml')
     * @param SerializerPluginInterface $serializer Serializer implementation
     */
    public static function registerSerializer(string $format, SerializerPluginInterface $serializer): void
    {
        self::getDefault()->registerSerializer($format, $serializer);
    }

    /**
     * Check if a serializer is registered for the given format.
     */
    public static function hasSerializer(string $format): bool
    {
        return self::getDefault()->hasSerializer($format);
    }

    /**
     * Get a registered serializer. Throws if not registered.
     *
     * @throws UnsupportedTypeException
     */
    public static function getSerializer(string $format): SerializerPluginInterface
    {
        return self::getDefault()->getSerializer($format);
    }

    /**
     * Clear all registered plugins. Intended for use in tests only.
     *
     * @internal
     */
    public static function reset(): void
    {
        self::getDefault()->reset();
    }
}
