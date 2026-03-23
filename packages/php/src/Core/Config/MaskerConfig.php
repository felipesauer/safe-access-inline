<?php

declare(strict_types=1);

namespace SafeAccessInline\Core\Config;

/**
 * Configuration for the {@see DataMasker} data-masking helper.
 *
 * Defines the replacement string applied to redacted values and the maximum
 * recursion depth searched when masking nested structures.
 *
 * Both PHP and JS `DataMasker` accept two kinds of patterns:
 *
 *   - **Glob** (`string`): case-insensitive shell-glob notation, e.g. `'*_secret'`.
 *     PHP delegates to `fnmatch()` with `FNM_CASEFOLD`; JS uses a glob-to-regex conversion.
 *
 *   - **Regex** (`string` delimited by `/`): PCRE in PHP, native `RegExp` in JS.
 *     PHP: `'/^password_\d+$/i'`; JS: `'/^password_\d+$/i'` (same delimiter notation).
 *
 * Key naming for glob patterns is case-insensitive on both platforms. The `RegExp`
 * type itself (as a JS runtime value) has no direct PHP equivalent — callers using
 * the PHP package must pass the regex as a delimited `string` rather than a `RegExp`
 * object. This is an expected language-idiomatic difference (plan item D3).
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
