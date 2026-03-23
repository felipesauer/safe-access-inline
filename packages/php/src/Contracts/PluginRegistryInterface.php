<?php

declare(strict_types=1);

namespace SafeAccessInline\Contracts;

/**
 * Contract for a plugin registry instance.
 *
 * Both the global static facade ({@see \SafeAccessInline\Core\Registries\PluginRegistry})
 * and isolated instances created via `PluginRegistry::create()` implement this interface,
 * enabling Dependency Injection and test isolation.
 */
interface PluginRegistryInterface
{
    /**
     * Register a parser plugin for a given format.
     *
     * @param string                $format Format identifier (e.g., 'yaml', 'toml')
     * @param ParserPluginInterface $parser Parser implementation
     */
    public function registerParser(string $format, ParserPluginInterface $parser): void;

    /**
     * Check if a parser is registered for the given format.
     */
    public function hasParser(string $format): bool;

    /**
     * Get a registered parser. Throws if not registered.
     *
     * @throws \SafeAccessInline\Exceptions\UnsupportedTypeException
     */
    public function getParser(string $format): ParserPluginInterface;

    /**
     * Register a serializer plugin for a given format.
     *
     * @param string                    $format     Format identifier (e.g., 'xml', 'yaml')
     * @param SerializerPluginInterface $serializer Serializer implementation
     */
    public function registerSerializer(string $format, SerializerPluginInterface $serializer): void;

    /**
     * Check if a serializer is registered for the given format.
     */
    public function hasSerializer(string $format): bool;

    /**
     * Get a registered serializer. Throws if not registered.
     *
     * @throws \SafeAccessInline\Exceptions\UnsupportedTypeException
     */
    public function getSerializer(string $format): SerializerPluginInterface;

    /**
     * Clear all registered parsers and serializers.
     *
     * @internal
     */
    public function reset(): void;
}
