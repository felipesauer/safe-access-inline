<?php

declare(strict_types=1);

namespace SafeAccessInline\Security;

use SafeAccessInline\Core\MaskerConfig;

final class DataMasker
{
    private static MaskerConfig $config;

    private static function config(): MaskerConfig
    {
        return self::$config ??= new MaskerConfig();
    }

    public static function configure(MaskerConfig $config): void
    {
        self::$config = $config;
    }

    private const COMMON_SENSITIVE_KEYS = [
        'password', 'secret', 'token', 'api_key', 'apikey', 'private_key',
        'passphrase', 'credential', 'auth', 'authorization', 'cookie',
        'session', 'ssn', 'credit_card', 'creditcard',
    ];

    private static function redactedValue(): string
    {
        return self::config()->defaultMaskValue;
    }

    /**
     * @param array<mixed> $data
     * @param array<string|non-empty-string> $patterns Glob patterns or regex patterns (delimited by /)
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
        if ($depth > self::config()->maxRecursionDepth) {
            return;
        }

        foreach ($obj as $key => &$value) {
            if (is_string($key) && self::matchesPattern($key, $patterns)) {
                $value = self::redactedValue();
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
            // Regex pattern: delimited by /
            if (str_starts_with($pattern, '/') && preg_match('/\/[a-zA-Z]*$/', $pattern) === 1) {
                $result = preg_match($pattern, $key);
                if ($result === false) {
                    throw new \InvalidArgumentException(
                        "Invalid regex pattern provided to DataMasker: '{$pattern}'. Error: " . preg_last_error_msg()
                    );
                }
                if ($result === 1) {
                    return true;
                }
                continue;
            }
            if (fnmatch($pattern, $key, FNM_CASEFOLD)) {
                return true;
            }
        }

        return false;
    }
}
