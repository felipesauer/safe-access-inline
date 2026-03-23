<?php

declare(strict_types=1);

namespace SafeAccessInline\Contracts;

/**
 * Contract for a schema registry instance.
 *
 * Both the global static facade ({@see \SafeAccessInline\Core\Registries\SchemaRegistry})
 * and isolated instances created via `SchemaRegistry::create()` implement this interface,
 * enabling Dependency Injection and test isolation.
 */
interface SchemaRegistryInterface
{
    /**
     * Sets the adapter that will be used when no explicit adapter is passed to validate().
     *
     * @param SchemaAdapterInterface $adapter Adapter to register as the default.
     */
    public function setDefaultAdapter(SchemaAdapterInterface $adapter): void;

    /**
     * Returns the current default adapter, or null if none is set.
     *
     * @return SchemaAdapterInterface|null The registered default adapter, or null.
     */
    public function getDefaultAdapter(): ?SchemaAdapterInterface;

    /**
     * Removes the default adapter, reverting to the no-adapter state.
     */
    public function clearDefaultAdapter(): void;
}
