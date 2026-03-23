/**
 * Configuration for ReDoS protection in filter expression pattern matching.
 *
 * Controls the maximum allowed regex pattern length within `[?match(...)]`
 * filter expressions. Patterns exceeding this limit are rejected to prevent
 * catastrophic backtracking.
 *
 * @remarks
 * **PHP vs JS gap:** PHP's PCRE engine enforces hard runtime limits via
 * `pcre.backtrack_limit` and `pcre.recursion_limit` directives, bounding
 * worst-case regex execution time at the engine level.
 * JavaScript's `RegExp` provides no equivalent runtime fence — only the
 * `maxPatternLength` guard (pattern syntax surface area) is available.
 * Prefer structurally simple, anchor-bounded patterns in production code.
 */
export interface FilterParserConfig {
    /** Maximum length of a regex pattern in a `match()` filter function. */
    readonly maxPatternLength: number;
}

/** @internal */
export const DEFAULT_FILTER_PARSER_CONFIG: FilterParserConfig = Object.freeze({
    maxPatternLength: 128,
});
