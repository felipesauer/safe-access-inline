<?php

declare(strict_types=1);

namespace SafeAccessInline\Core\Config;

/**
 * Configuration for the {@see DeepMerger} utility.
 *
 * Limits recursion depth during deep-merge operations to prevent stack overflows
 * caused by deeply nested or cyclically structured inputs.
 */
final readonly class MergerConfig
{
    /** Maximum recursion depth allowed when deep-merging nested arrays. */
    public const DEFAULT_MAX_DEPTH = 512;

    /**
     * @param int $maxDepth Maximum recursion depth allowed when merging nested arrays.
     */
    public function __construct(
        public int $maxDepth = self::DEFAULT_MAX_DEPTH,
    ) {
    }
}
