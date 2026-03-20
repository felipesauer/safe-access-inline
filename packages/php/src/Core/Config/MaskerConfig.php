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
     * @param string $defaultMaskValue    Replacement value used for redacted fields.
     * @param int    $maxRecursionDepth   Maximum nesting depth before masking stops recursing.
     */
    public function __construct(
        public string $defaultMaskValue = self::DEFAULT_MASK_VALUE,
        public int $maxRecursionDepth = self::DEFAULT_MAX_RECURSION_DEPTH,
    ) {
    }
}
