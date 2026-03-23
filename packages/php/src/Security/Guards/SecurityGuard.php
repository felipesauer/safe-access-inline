<?php

declare(strict_types=1);

namespace SafeAccessInline\Security\Guards;

use SafeAccessInline\Exceptions\SecurityException;
use SafeAccessInline\Security\Audit\AuditLogger;

/**
 * Validates object keys against a deny-list to prevent prototype-pollution attacks.
 *
 * All keys that could alter prototype behaviour in JavaScript (and analogous
 * PHP objects) are blocked. {@see assertSafeKey()} throws {@see SecurityException}
 * on any match and emits a `security.violation` audit event.
 */
final class SecurityGuard
{
    /**
     * Keys that are unconditionally forbidden to prevent prototype-pollution
     * and object-hijacking vulnerabilities.
     *
     * @var string[]
     */
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

    /** @var array<string, true>|null Lazy-initialised map keyed by forbidden string for O(1) lookup. */
    private static ?array $forbiddenKeysMap = null;

    /**
     * Returns a map of forbidden keys for O(1) membership testing.
     *
     * The map is built once and cached on the first call.
     *
     * @return array<string, true> Forbidden keys mapped to `true`.
     */
    private static function getForbiddenKeysMap(): array
    {
        if (self::$forbiddenKeysMap === null) {
            self::$forbiddenKeysMap = array_fill_keys(self::FORBIDDEN_KEYS, true);
        }
        return self::$forbiddenKeysMap;
    }

    /**
     * Returns `true` when `$key` is a forbidden prototype-pollution vector,
     * without throwing an exception.
     *
     * Use this method in hot-path read guards where the desired behaviour is to
     * silently skip or return a default value rather than to error. Avoids the
     * overhead of a try-catch around {@see assertSafeKey()}.
     *
     * **JS alignment:** mirrors `SecurityGuard.isForbiddenKey(key)` in the JS package.
     *
     * @param string $key The property name to test.
     * @see assertSafeKey() for the throwing variant
     */
    public static function isForbiddenKey(string $key): bool
    {
        return isset(self::getForbiddenKeysMap()[$key]);
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
