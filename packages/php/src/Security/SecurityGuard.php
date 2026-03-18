<?php

namespace SafeAccessInline\Security;

use SafeAccessInline\Exceptions\SecurityException;

final class SecurityGuard
{
    private const FORBIDDEN_KEYS = [
        '__proto__',
        'constructor',
        'prototype',
        '__defineGetter__',
        '__defineSetter__',
        '__lookupGetter__',
        '__lookupSetter__',
        'valueOf',
        'toString',
        'hasOwnProperty',
        'isPrototypeOf',
    ];

    /** @var array<string, true>|null */
    private static ?array $forbiddenKeysMap = null;

    /**
     * @return array<string, true>
     */
    private static function getForbiddenKeysMap(): array
    {
        if (self::$forbiddenKeysMap === null) {
            self::$forbiddenKeysMap = array_fill_keys(self::FORBIDDEN_KEYS, true);
        }
        return self::$forbiddenKeysMap;
    }

    /**
     * @throws SecurityException
     */
    public static function assertSafeKey(string $key): void
    {
        if (isset(self::getForbiddenKeysMap()[$key])) {
            AuditLogger::emit('security.violation', ['reason' => 'forbidden_key', 'key' => $key]);
            throw new SecurityException(
                "Forbidden key '{$key}' detected. This key is blocked to prevent prototype pollution."
            );
        }
    }

    /**
     * Recursively removes forbidden keys from an array structure.
     *
     * @param array<mixed> $data
     * @return array<mixed>
     */
    public static function sanitizeObject(array $data): array
    {
        $map = self::getForbiddenKeysMap();
        $cleaned = [];
        foreach ($data as $key => $value) {
            if (is_string($key) && isset($map[$key])) {
                continue;
            }
            $cleaned[$key] = is_array($value) ? self::sanitizeObject($value) : $value;
        }
        return $cleaned;
    }
}
