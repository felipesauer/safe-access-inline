<?php

declare(strict_types=1);

namespace SafeAccessInline\Core;

/**
 * Configuration for ReDoS protection in filter expression pattern matching.
 *
 * Controls the maximum allowed regex pattern length and PCRE engine limits
 * within `[?match(...)]` filter expressions.
 */
final readonly class FilterParserConfig
{
    /** Default maximum regex pattern length for the `match()` filter function. */
    public const DEFAULT_MAX_PATTERN_LENGTH = 128;

    /** Default PCRE backtrack limit applied during regex evaluation. */
    public const DEFAULT_PCRE_BACKTRACK_LIMIT = 1000;

    /** Default PCRE recursion limit applied during regex evaluation. */
    public const DEFAULT_PCRE_RECURSION_LIMIT = 100;

    /**
     * @param int $maxPatternLength  Maximum length of a regex pattern in a `match()` filter.
     * @param int $pcreBacktrackLimit PCRE backtrack limit set during regex evaluation.
     * @param int $pcreRecursionLimit PCRE recursion limit set during regex evaluation.
     */
    public function __construct(
        public int $maxPatternLength = self::DEFAULT_MAX_PATTERN_LENGTH,
        public int $pcreBacktrackLimit = self::DEFAULT_PCRE_BACKTRACK_LIMIT,
        public int $pcreRecursionLimit = self::DEFAULT_PCRE_RECURSION_LIMIT,
    ) {
    }
}
