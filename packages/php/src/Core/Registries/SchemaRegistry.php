<?php

declare(strict_types=1);

namespace SafeAccessInline\Core\Registries;

use SafeAccessInline\Contracts\SchemaAdapterInterface;
use SafeAccessInline\Core\AbstractAccessor;

/**
 * Global registry for a default schema adapter.
 *
 * Allows users to set a default adapter so it does not need to be passed
 * every time {@see AbstractAccessor::validate()} is called.
 */
final class SchemaRegistry
{
    /** The default schema adapter used when none is explicitly passed to validate(). */
    private static ?SchemaAdapterInterface $defaultAdapter = null;

    /**
     * Sets the adapter that will be used when no explicit adapter is passed to validate().
     *
     * @param SchemaAdapterInterface $adapter Adapter to register as the global default.
     */
    public static function setDefaultAdapter(SchemaAdapterInterface $adapter): void
    {
        self::$defaultAdapter = $adapter;
    }

    /**
     * Returns the current default adapter, or null if none is set.
     *
     * @return SchemaAdapterInterface|null The registered default adapter, or null.
     */
    public static function getDefaultAdapter(): ?SchemaAdapterInterface
    {
        return self::$defaultAdapter;
    }

    /**
     * Removes the default adapter, reverting to the no-adapter state.
     */
    public static function clearDefaultAdapter(): void
    {
        self::$defaultAdapter = null;
    }
}
