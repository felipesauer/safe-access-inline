<?php

declare(strict_types=1);

namespace SafeAccessInline\Core\Config;

/**
 * Configuration for the {@see DeepMerger} utility.
 *
 * @param int $maxMergeDepth Maximum recursion depth allowed when merging nested arrays.
 */
final readonly class MergerConfig
{
    public const DEFAULT_MAX_MERGE_DEPTH = 512;

    public function __construct(
        public int $maxMergeDepth = self::DEFAULT_MAX_MERGE_DEPTH,
    ) {
    }
}
