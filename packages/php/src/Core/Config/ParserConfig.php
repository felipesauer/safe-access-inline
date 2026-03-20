<?php

declare(strict_types=1);

namespace SafeAccessInline\Core\Config;

/**
 * Configuration for recursive path-resolution and parsing depth limits.
 *
 * Guards against stack overflows by bounding how deep the
 * {@see \SafeAccessInline\Core\Resolvers\PathResolver} is allowed to recurse
 * when evaluating nested or recursive-descent path expressions.
 */
final readonly class ParserConfig
{
    /** Maximum recursion depth when resolving nested or recursive-descent paths. */
    public const DEFAULT_MAX_RESOLVE_DEPTH = 512;

    /** Maximum nesting depth allowed when parsing XML documents (DoS protection). */
    public const DEFAULT_MAX_XML_DEPTH = 100;

    /**
     * @param int $maxResolveDepth Maximum recursion depth when resolving nested/recursive-descent paths.
     * @param int $maxXmlDepth     Maximum nesting depth allowed when parsing XML documents.
     */
    public function __construct(
        public int $maxResolveDepth = self::DEFAULT_MAX_RESOLVE_DEPTH,
        public int $maxXmlDepth = self::DEFAULT_MAX_XML_DEPTH,
    ) {
    }
}
