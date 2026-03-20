<?php

declare(strict_types=1);

namespace SafeAccessInline\Core\Config;

/**
 * Configuration for the {@see DataMasker} data-masking helper.
 *
 * Defines the replacement string applied to redacted values and the maximum
 * recursion depth searched when masking nested structures.
 */
final readonly class MaskerConfig
{
    /** Default replacement string substituted for redacted field values. */
    public const DEFAULT_MASK_VALUE = '[REDACTED]';

    /** Maximum nesting depth before the masker stops recursing into nested arrays. */
    public const DEFAULT_MAX_RECURSION_DEPTH = 100;

    /**
     * Maximum number of compiled regex patterns cached in memory.
     *
     * Bounds the pattern cache to prevent unbounded memory growth when `mask()`
     * is called with many distinct regex patterns across a long-running process.
     * When the limit is reached, the oldest cached entry is evicted (FIFO).
     */
    public const DEFAULT_MAX_PATTERN_CACHE_SIZE = 200;

    /**
     * @param string $defaultMaskValue      Replacement value used for redacted fields.
     * @param int    $maxRecursionDepth      Maximum nesting depth before masking stops recursing.
     * @param int    $maxPatternCacheSize    Maximum number of compiled regex entries to cache.
     */
    public function __construct(
        public string $defaultMaskValue = self::DEFAULT_MASK_VALUE,
        public int $maxRecursionDepth = self::DEFAULT_MAX_RECURSION_DEPTH,
        public int $maxPatternCacheSize = self::DEFAULT_MAX_PATTERN_CACHE_SIZE,
    ) {
    }
}
