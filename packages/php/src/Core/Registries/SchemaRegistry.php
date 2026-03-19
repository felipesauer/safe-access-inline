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
    private static ?SchemaAdapterInterface $defaultAdapter = null;

    /** Sets the adapter that will be used when no explicit adapter is passed to validate(). */
    public static function setDefaultAdapter(SchemaAdapterInterface $adapter): void
    {
        self::$defaultAdapter = $adapter;
    }

    /** Returns the current default adapter, or null if none is set. */
    public static function getDefaultAdapter(): ?SchemaAdapterInterface
    {
        return self::$defaultAdapter;
    }

    /** Removes the default adapter. */
    public static function clearDefaultAdapter(): void
    {
        self::$defaultAdapter = null;
    }
}
