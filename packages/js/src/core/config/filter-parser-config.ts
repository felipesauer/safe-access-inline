/**
 * Configuration for ReDoS protection in filter expression pattern matching.
 *
 * Controls the maximum allowed regex pattern length within `[?match(...)]`
 * filter expressions. Patterns exceeding this limit are rejected to prevent
 * catastrophic backtracking.
 */
export interface FilterParserConfig {
    /** Maximum length of a regex pattern in a `match()` filter function. */
    readonly maxPatternLength: number;
}

/** @internal */
export const DEFAULT_FILTER_PARSER_CONFIG: FilterParserConfig = Object.freeze({
    maxPatternLength: 128,
});
