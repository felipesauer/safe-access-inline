<?php

namespace SafeAccessInline\Core;

use SafeAccessInline\Security\SecurityGuard;

/**
 * Deep merge utility for layered configuration.
 * Objects are merged recursively. Primitives and arrays are replaced by last source.
 */
final class DeepMerger
{
    /**
     * @param array<mixed> $base
     * @param array<mixed> ...$overrides
     * @return array<mixed>
     */
    public static function merge(array $base, array ...$overrides): array
    {
        $result = $base;

        foreach ($overrides as $override) {
            $result = self::mergeTwo($result, $override);
        }

        return $result;
    }

    /**
     * @param array<mixed> $target
     * @param array<mixed> $source
     * @return array<mixed>
     */
    private static function mergeTwo(array $target, array $source): array
    {
        $result = $target;

        foreach ($source as $key => $srcVal) {
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
                $result[$key] = self::mergeTwo($result[$key], $srcVal);
            } else {
                $result[$key] = $srcVal;
            }
        }

        return $result;
    }
}
