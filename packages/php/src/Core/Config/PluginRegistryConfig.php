<?php

declare(strict_types=1);

namespace SafeAccessInline\Core\Config;

/**
 * Configuration for the {@see \SafeAccessInline\Core\Registries\PluginRegistry}.
 *
 * Bounding the registry prevents unbounded heap growth in long-running processes
 * (Swoole, RoadRunner, FrankenPHP) or multi-tenant contexts where
 * {@see \SafeAccessInline\Core\Registries\PluginRegistry::registerParser()} or
 * {@see \SafeAccessInline\Core\Registries\PluginRegistry::registerSerializer()} could
 * be called with many adversarially distinct format keys.
 *
 * Overwriting an already-registered format does **not** count towards the limit,
 * consistent with the JS implementation.
 */
final readonly class PluginRegistryConfig
{
    /**
     * Maximum number of distinct parser formats that can be registered simultaneously.
     *
     * Re-registering an existing format key is always allowed and does not count
     * towards this limit.
     */
    public const DEFAULT_MAX_PARSERS = 50;

    /**
     * Maximum number of distinct serializer formats that can be registered simultaneously.
     *
     * Re-registering an existing format key is always allowed and does not count
     * towards this limit.
     */
    public const DEFAULT_MAX_SERIALIZERS = 50;

    /**
     * @param int $maxParsers    Maximum number of distinct parser formats.
     * @param int $maxSerializers Maximum number of distinct serializer formats.
     */
    public function __construct(
        public int $maxParsers = self::DEFAULT_MAX_PARSERS,
        public int $maxSerializers = self::DEFAULT_MAX_SERIALIZERS,
    ) {
    }
}
