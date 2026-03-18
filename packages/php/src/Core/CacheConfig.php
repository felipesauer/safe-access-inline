<?php

declare(strict_types=1);

namespace SafeAccessInline\Core;

/**
 * Configuration for the parsed-path LRU cache ({@see PathCache}).
 *
 * @param int $maxSize Maximum number of parsed paths to retain.
 */
final readonly class CacheConfig
{
    public const DEFAULT_MAX_SIZE = 1000;

    public function __construct(
        public int $maxSize = self::DEFAULT_MAX_SIZE,
    ) {
    }
}
