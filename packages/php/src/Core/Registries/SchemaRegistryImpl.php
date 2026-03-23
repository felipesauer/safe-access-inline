<?php

declare(strict_types=1);

namespace SafeAccessInline\Core\Registries;

use SafeAccessInline\Contracts\SchemaAdapterInterface;
use SafeAccessInline\Contracts\SchemaRegistryInterface;
use SafeAccessInline\Security\Audit\AuditLogger;

/**
 * Concrete, instantiable implementation of {@see SchemaRegistryInterface}.
 *
 * Used internally by the global {@see SchemaRegistry} static facade and by
 * isolated instances created via {@see SchemaRegistry::create()} for DI / testing.
 *
 * @internal
 */
final class SchemaRegistryImpl implements SchemaRegistryInterface
{
    /** The default schema adapter used when none is explicitly passed to validate(). */
    private ?SchemaAdapterInterface $defaultAdapter = null;

    /**
     * Sets the adapter that will be used when no explicit adapter is passed to validate().
     *
     * @param SchemaAdapterInterface $adapter Adapter to register as the default.
     */
    public function setDefaultAdapter(SchemaAdapterInterface $adapter): void
    {
        if ($this->defaultAdapter !== null) {
            AuditLogger::emit('plugin.overwrite', [
                'kind' => 'schema-adapter',
                'message' => 'Default schema adapter is being overwritten.',
            ]);
        }
        $this->defaultAdapter = $adapter;
    }

    /**
     * Returns the current default adapter, or null if none is set.
     *
     * @return SchemaAdapterInterface|null The registered default adapter, or null.
     */
    public function getDefaultAdapter(): ?SchemaAdapterInterface
    {
        return $this->defaultAdapter;
    }

    /**
     * Removes the default adapter, reverting to the no-adapter state.
     */
    public function clearDefaultAdapter(): void
    {
        $this->defaultAdapter = null;
    }
}
