<?php

declare(strict_types=1);

namespace SafeAccessInline\Core\Registries;

use SafeAccessInline\Contracts\ParserPluginInterface;
use SafeAccessInline\Contracts\PluginRegistryInterface;
use SafeAccessInline\Contracts\SerializerPluginInterface;
use SafeAccessInline\Core\Config\PluginRegistryConfig;
use SafeAccessInline\Exceptions\UnsupportedTypeException;

/**
 * Concrete, instantiable implementation of {@see PluginRegistryInterface}.
 *
 * Used internally by the global {@see PluginRegistry} static facade and by
 * isolated instances created via {@see PluginRegistry::create()} for DI / testing.
 *
 * @internal
 */
final class PluginRegistryImpl implements PluginRegistryInterface
{
    /** Maximum number of distinct parser formats that can be registered. */
    private const MAX_PARSERS = PluginRegistryConfig::DEFAULT_MAX_PARSERS;

    /** Maximum number of distinct serializer formats that can be registered. */
    private const MAX_SERIALIZERS = PluginRegistryConfig::DEFAULT_MAX_SERIALIZERS;

    /** @var array<string, ParserPluginInterface> Map of format identifier to registered parser plugin. */
    private array $parsers = [];

    /** @var array<string, SerializerPluginInterface> Map of format identifier to registered serializer plugin. */
    private array $serializers = [];

    // ── Parser Registration ────────────────────────

    /**
     * Register a parser plugin for a given format.
     *
     * @param string                $format Format identifier (e.g., 'yaml', 'toml')
     * @param ParserPluginInterface $parser Parser implementation
     */
    public function registerParser(string $format, ParserPluginInterface $parser): void
    {
        if (!isset($this->parsers[$format]) && count($this->parsers) >= self::MAX_PARSERS) {
            throw new \RangeException(
                sprintf(
                    'Max parser plugins (%d) reached. Call PluginRegistry::reset() to clear before registering new formats.',
                    self::MAX_PARSERS,
                )
            );
        }
        $this->parsers[$format] = $parser;
    }

    /**
     * Check if a parser is registered for the given format.
     */
    public function hasParser(string $format): bool
    {
        return isset($this->parsers[$format]);
    }

    /**
     * Get a registered parser. Throws if not registered.
     *
     * @throws UnsupportedTypeException
     */
    public function getParser(string $format): ParserPluginInterface
    {
        if (!isset($this->parsers[$format])) {
            throw new UnsupportedTypeException(
                "No parser registered for format '{$format}'. "
                . "Register one with: PluginRegistry::registerParser('{$format}', new YourParser())"
            );
        }

        return $this->parsers[$format];
    }

    // ── Serializer Registration ────────────────────

    /**
     * Register a serializer plugin for a given format.
     *
     * @param string                    $format     Format identifier (e.g., 'xml', 'yaml')
     * @param SerializerPluginInterface $serializer Serializer implementation
     */
    public function registerSerializer(string $format, SerializerPluginInterface $serializer): void
    {
        if (!isset($this->serializers[$format]) && count($this->serializers) >= self::MAX_SERIALIZERS) {
            throw new \RangeException(
                sprintf(
                    'Max serializer plugins (%d) reached. Call PluginRegistry::reset() to clear before registering new formats.',
                    self::MAX_SERIALIZERS,
                )
            );
        }
        $this->serializers[$format] = $serializer;
    }

    /**
     * Check if a serializer is registered for the given format.
     */
    public function hasSerializer(string $format): bool
    {
        return isset($this->serializers[$format]);
    }

    /**
     * Get a registered serializer. Throws if not registered.
     *
     * @throws UnsupportedTypeException
     */
    public function getSerializer(string $format): SerializerPluginInterface
    {
        if (!isset($this->serializers[$format])) {
            throw new UnsupportedTypeException(
                "No serializer registered for format '{$format}'. "
                . "Register one with: PluginRegistry::registerSerializer('{$format}', new YourSerializer())"
            );
        }

        return $this->serializers[$format];
    }

    // ── Reset (for testing) ─────────────────────────

    /**
     * Clear all registered plugins. Intended for use in tests only.
     *
     * @internal
     */
    public function reset(): void
    {
        $this->parsers = [];
        $this->serializers = [];
    }
}
