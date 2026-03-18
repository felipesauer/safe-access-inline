<?php

declare(strict_types=1);

namespace SafeAccessInline\Core;

/**
 * Configuration for recursive path-resolution depth limits.
 *
 * @param int $maxResolveDepth Maximum recursion depth when resolving nested/recursive-descent paths.
 */
final readonly class ParserConfig
{
    public const DEFAULT_MAX_RESOLVE_DEPTH = 512;

    public function __construct(
        public int $maxResolveDepth = self::DEFAULT_MAX_RESOLVE_DEPTH,
    ) {
    }
}
