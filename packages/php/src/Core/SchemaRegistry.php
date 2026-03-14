<?php

namespace SafeAccessInline\Core;

use SafeAccessInline\Contracts\SchemaAdapterInterface;

final class SchemaRegistry
{
    private static ?SchemaAdapterInterface $defaultAdapter = null;

    public static function setDefaultAdapter(SchemaAdapterInterface $adapter): void
    {
        self::$defaultAdapter = $adapter;
    }

    public static function getDefaultAdapter(): ?SchemaAdapterInterface
    {
        return self::$defaultAdapter;
    }

    public static function clearDefaultAdapter(): void
    {
        self::$defaultAdapter = null;
    }
}
