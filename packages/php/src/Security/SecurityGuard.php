<?php

namespace SafeAccessInline\Security;

use SafeAccessInline\Exceptions\SecurityException;

final class SecurityGuard
{
    private const FORBIDDEN_KEYS = ['__proto__', 'constructor', 'prototype'];

    /**
     * @throws SecurityException
     */
    public static function assertSafeKey(string $key): void
    {
        if (in_array($key, self::FORBIDDEN_KEYS, true)) {
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
        $cleaned = [];
        foreach ($data as $key => $value) {
            if (is_string($key) && in_array($key, self::FORBIDDEN_KEYS, true)) {
                continue;
            }
            $cleaned[$key] = is_array($value) ? self::sanitizeObject($value) : $value;
        }
        return $cleaned;
    }
}
