<?php

declare(strict_types=1);

namespace SafeAccessInline\Core\Registries;

use SafeAccessInline\Contracts\SchemaAdapterInterface;
use SafeAccessInline\Contracts\SchemaRegistryInterface;

/**
 * Global registry for a default schema adapter.
 *
 * Allows users to set a default adapter so it does not need to be passed
 * every time {@see AbstractAccessor::validate()} is called.
 *
 * All static methods delegate to a shared module-level default instance.
 * For test isolation or DI, use {@see SchemaRegistry::create()} to obtain
 * a fresh {@see SchemaRegistryInterface} instance that is fully independent.
 *
 * **Long-running runtimes (Swoole, RoadRunner, FrankenPHP):** Static state persists
 * across requests. Call {@see SchemaRegistry::clearDefaultAdapter()} in your worker
 * boot/reset hook to prevent stale adapter references leaking between requests.
 */
final class SchemaRegistry
{
    /** Default instance backing all static facade methods. */
    private static ?SchemaRegistryInterface $default = null;

    // ── Factory & DI ────────────────────────────────

    /**
     * Creates a new, isolated schema registry instance.
     *
     * Use this in tests or DI contexts where you need a scope that is completely
     * independent of the global default registry.
     *
     * @return SchemaRegistryInterface A fresh registry instance with no adapter set.
     */
    public static function create(): SchemaRegistryInterface
    {
        return new SchemaRegistryImpl();
    }

    /**
     * Returns the global default registry instance backing all static methods.
     *
     * Prefer the static convenience methods for most use-cases; use `getDefault()`
     * only when you need to pass the registry as a {@see SchemaRegistryInterface} reference.
     *
     * @return SchemaRegistryInterface The shared module-level instance.
     */
    public static function getDefault(): SchemaRegistryInterface
    {
        return self::$default ??= new SchemaRegistryImpl();
    }

    // ── Static Facade (backward-compatible API) ──────

    /**
     * Sets the adapter that will be used when no explicit adapter is passed to validate().
     *
     * @param SchemaAdapterInterface $adapter Adapter to register as the global default.
     */
    public static function setDefaultAdapter(SchemaAdapterInterface $adapter): void
    {
        self::getDefault()->setDefaultAdapter($adapter);
    }

    /**
     * Returns the current default adapter, or null if none is set.
     *
     * @return SchemaAdapterInterface|null The registered default adapter, or null.
     */
    public static function getDefaultAdapter(): ?SchemaAdapterInterface
    {
        return self::getDefault()->getDefaultAdapter();
    }

    /**
     * Removes the default adapter so subsequent `validate()` calls require an explicit adapter.
     */
    public static function clearDefaultAdapter(): void
    {
        self::getDefault()->clearDefaultAdapter();
    }
}
