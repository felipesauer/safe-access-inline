<?php

namespace SafeAccessInline\Security;

final class DataMasker
{
    private const COMMON_SENSITIVE_KEYS = [
        'password', 'secret', 'token', 'api_key', 'apikey', 'private_key',
        'passphrase', 'credential', 'auth', 'authorization', 'cookie',
        'session', 'ssn', 'credit_card', 'creditcard',
    ];

    private const REDACTED = '[REDACTED]';

    /**
     * @param array<mixed> $data
     * @param array<string> $patterns Glob or string patterns
     * @return array<mixed>
     */
    public static function mask(array $data, array $patterns = []): array
    {
        AuditLogger::emit('data.mask', ['patternCount' => count($patterns)]);
        $result = $data;
        self::maskRecursive($result, $patterns, 0);
        return $result;
    }

    /**
     * @param array<mixed> $obj
     * @param array<string> $patterns
     */
    private static function maskRecursive(array &$obj, array $patterns, int $depth): void
    {
        if ($depth > 100) {
            return;
        }

        foreach ($obj as $key => &$value) {
            if (is_string($key) && self::matchesPattern($key, $patterns)) {
                $value = self::REDACTED;
            } elseif (is_array($value) && !array_is_list($value)) {
                self::maskRecursive($value, $patterns, $depth + 1);
            } elseif (is_array($value) && array_is_list($value)) {
                foreach ($value as &$item) {
                    if (is_array($item) && !array_is_list($item)) {
                        self::maskRecursive($item, $patterns, $depth + 1);
                    }
                }
                unset($item);
            }
        }
        unset($value);
    }

    /**
     * @param array<string> $patterns
     */
    private static function matchesPattern(string $key, array $patterns): bool
    {
        if (in_array(strtolower($key), self::COMMON_SENSITIVE_KEYS, true)) {
            return true;
        }

        foreach ($patterns as $pattern) {
            if (fnmatch($pattern, $key, FNM_CASEFOLD)) {
                return true;
            }
        }

        return false;
    }
}
