<?php

declare(strict_types=1);

namespace SafeAccessInline\Core;

/**
 * Configuration for the {@see DataMasker} data-masking helper.
 *
 * @param string $defaultMaskValue Replacement value used for redacted fields.
 * @param int    $maxRecursionDepth Maximum nesting depth before masking stops recursing.
 */
final readonly class MaskerConfig
{
    public const DEFAULT_MASK_VALUE = '[REDACTED]';
    public const DEFAULT_MAX_RECURSION_DEPTH = 100;

    public function __construct(
        public string $defaultMaskValue = self::DEFAULT_MASK_VALUE,
        public int $maxRecursionDepth = self::DEFAULT_MAX_RECURSION_DEPTH,
    ) {
    }
}
