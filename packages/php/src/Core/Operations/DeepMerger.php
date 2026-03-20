<?php

declare(strict_types=1);

namespace SafeAccessInline\Core\Operations;

use SafeAccessInline\Core\Config\MergerConfig;
use SafeAccessInline\Security\Guards\SecurityGuard;

/**
 * Deep merge utility for layered configuration.
 * Objects are merged recursively. Primitives and arrays are replaced by last source.
 */
final class DeepMerger
{
    /** Active merger configuration, lazily initialised on first access. */
    private static MergerConfig $config;

    /**
     * Returns the active merger configuration, lazily initialised.
     */
    private static function config(): MergerConfig
    {
        return self::$config ??= new MergerConfig();
    }

    /**
     * Overrides the default merger configuration.
     *
     * @param MergerConfig $config New configuration to apply.
     */
    public static function configure(MergerConfig $config): void
    {
        self::$config = $config;
    }
    /**
     * @param array<mixed> $base
     * @param array<mixed> ...$overrides
     * @return array<mixed>
     */
    public static function merge(array $base, array ...$overrides): array
    {
        $result = $base;

        foreach ($overrides as $override) {
            $result = self::mergeTwo($result, $override, 0);
        }

        return $result;
    }

    /**
     * @param array<mixed> $target
     * @param array<mixed> $source
     * @return array<mixed>
     */
    private static function mergeTwo(array $target, array $source, int $depth = 0): array
    {
        if ($depth > self::config()->maxDepth) {
            throw new \RuntimeException('Deep merge exceeded maximum depth of ' . self::config()->maxDepth);
        }

        $result = $target;

        foreach ($source as $key => $srcVal) {
            // Prevent prototype-pollution during deep merge (OWASP A03:2021 — Injection)
            if (is_string($key)) {
                SecurityGuard::assertSafeKey($key);
            }

            if (
                is_array($srcVal)
                && !array_is_list($srcVal)
                && isset($result[$key])
                && is_array($result[$key])
                && !array_is_list($result[$key])
            ) {
                $result[$key] = self::mergeTwo($result[$key], $srcVal, $depth + 1);
            } elseif (is_array($srcVal)) {
                // Recursively sanitize list arrays to catch forbidden string keys in nested structures
                $result[$key] = self::sanitizeArray($srcVal);
            } else {
                $result[$key] = $srcVal;
            }
        }

        return $result;
    }

    /**
     * Recursively checks string keys within list arrays for forbidden keys.
     *
     * @param array<mixed> $data
     * @return array<mixed>
     */
    private static function sanitizeArray(array $data): array
    {
        foreach ($data as $key => $value) {
            if (is_string($key)) {
                SecurityGuard::assertSafeKey($key);
            }
            if (is_array($value)) {
                $data[$key] = self::sanitizeArray($value);
            }
        }
        return $data;
    }
}
