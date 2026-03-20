<?php

declare(strict_types=1);

namespace SafeAccessInline\Core\Config;

/**
 * Configuration for the parsed-path LRU cache ({@see PathCache}).
 *
 * Limits the number of dot-notation paths kept in memory after parsing,
 * preventing unbounded memory growth in long-running processes.
 */
final readonly class CacheConfig
{
    /** Maximum number of parsed path entries retained in the LRU cache. */
    public const DEFAULT_MAX_SIZE = 1000;

    /**
     * @param int $maxSize Maximum number of parsed paths to retain.
     */
    public function __construct(
        public int $maxSize = self::DEFAULT_MAX_SIZE,
    ) {
    }
}
