<?php

declare(strict_types=1);

namespace SafeAccessInline\Security\Sanitizers;

use SafeAccessInline\Core\Config\MaskerConfig;
use SafeAccessInline\Security\Audit\AuditLogger;

/**
 * Recursively masks sensitive keys in a data array using a configurable rule set.
 *
 * Built-in sensitive key names ({@see COMMON_SENSITIVE_KEYS}) are always masked.
 * Callers may supply additional glob or regex patterns via {@see mask()}.
 */
final class DataMasker
{
    /** Active masker configuration, lazily initialised on first access. */
    private static MaskerConfig $config;

    /**
     * Compiled regex pattern cache keyed by raw pattern string.
     *
     * Bounded by {@see MaskerConfig::$maxPatternCacheSize} to prevent unbounded
     * memory growth in long-running processes that mask with many distinct patterns.
     * Eviction is LRU: a cache hit moves the entry to the end of the array;
     * when the cache is full, the least-recently-used entry (first in array) is removed.
     *
     * @var array<string, bool> Keys are raw pattern strings; values are always `true`.
     */
    private static array $patternCache = [];

    /**
     * Returns the active masker configuration, lazily initialised with defaults.
     *
     * @return MaskerConfig The current configuration.
     */
    private static function config(): MaskerConfig
    {
        return self::$config ??= new MaskerConfig();
    }

    /**
     * Replaces the active masker configuration and clears the compiled pattern cache.
     *
     * @param MaskerConfig $config New configuration to apply.
     */
    public static function configure(MaskerConfig $config): void
    {
        self::$config = $config;
        self::$patternCache = [];
    }

    /**
     * Common key names that are always treated as sensitive regardless of caller-supplied patterns.
     *
     * @var string[]
     */
    private const COMMON_SENSITIVE_KEYS = [
        'password', 'secret', 'token', 'api_key', 'apikey', 'private_key',
        'passphrase', 'credential', 'auth', 'authorization', 'cookie',
        'session', 'ssn', 'credit_card', 'creditcard',
    ];

    /**
     * Returns the redacted placeholder value from the active configuration.
     *
     * @return string Mask value (e.g. `'[REDACTED]'`).
     */
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
     * Recursively walks `$obj` and replaces values at matching keys with the redact placeholder.
     *
     * Traversal is capped at {@see MaskerConfig::$maxRecursionDepth} to prevent unbounded recursion.
     *
     * @param array<mixed>  $obj      Data array to mask in-place.
     * @param array<string> $patterns Additional glob or regex patterns.
     * @param int           $depth    Current recursion depth.
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
     * Determines whether a key name matches the built-in list or any caller-supplied pattern.
     *
     * Regex patterns must be delimited by `/`; all other values are treated as
     * case-insensitive glob patterns via {@see fnmatch()}.
     *
     * Compiled regex patterns are cached up to {@see MaskerConfig::$maxPatternCacheSize}
     * entries with LRU semantics: a cache hit promotes the entry to the most-recently-used
     * position; when the cache is full, the least-recently-used entry is evicted.
     *
     * @param  string        $key      Key name to test.
     * @param  array<string> $patterns Caller-supplied patterns (glob or `/regex/`).
     * @return bool True when the key should be redacted.
     *
     * @throws \InvalidArgumentException When a regex pattern is syntactically invalid.
     */
    private static function matchesPattern(string $key, array $patterns): bool
    {
        if (in_array(strtolower($key), self::COMMON_SENSITIVE_KEYS, true)) {
            return true;
        }

        foreach ($patterns as $pattern) {
            // Regex pattern: delimited by /
            if (str_starts_with($pattern, '/') && preg_match('/\/[a-zA-Z]*$/', $pattern) === 1) {
                $cacheKey = $pattern;
                if (array_key_exists($cacheKey, self::$patternCache)) {
                    // LRU: promote to most-recently-used position
                    unset(self::$patternCache[$cacheKey]);
                    self::$patternCache[$cacheKey] = true;
                } else {
                    $maxCacheSize = self::config()->maxPatternCacheSize;
                    if (count(self::$patternCache) >= $maxCacheSize) {
                        // LRU eviction: remove the least-recently-used entry (first in array)
                        reset(self::$patternCache);
                        $oldestKey = key(self::$patternCache);
                        if ($oldestKey !== null) {
                            unset(self::$patternCache[$oldestKey]);
                        }
                    }
                    self::$patternCache[$cacheKey] = true;
                }
                $result = @preg_match($pattern, $key);
                if ($result === false || preg_last_error() !== PREG_NO_ERROR) {
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
