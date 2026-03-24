/**
 * Optional output controls for {@link AccessorInterface.toJson}.
 *
 * Mirrors PHP's `toJson()` which always outputs UTF-8 with unicode characters
 * unescaped (PHP `JSON_UNESCAPED_UNICODE`). JS escapes non-ASCII to `\uXXXX`
 * by default; set `unescapeUnicode: true` to replicate PHP's behaviour.
 */
export interface ToJsonOptions {
    /**
     * When `true`, replaces `\uXXXX` escape sequences in the output with their
     * actual Unicode characters — equivalent to PHP's `JSON_UNESCAPED_UNICODE`.
     *
     * @defaultValue false
     */
    readonly unescapeUnicode?: boolean;

    /**
     * When `true`, replaces `\/` with `/` in the output — equivalent to PHP's
     * `JSON_UNESCAPED_SLASHES`.
     *
     * @defaultValue false
     */
    readonly unescapeSlashes?: boolean;

    /**
     * Indentation to use when `pretty` is `true`. Overrides the default of `2`.
     * Accepts a number (spaces) or a string (e.g. `'\t'`).
     *
     * @defaultValue 2
     */
    readonly space?: number | string;
}

/**
 * Complete accessor contract combining read, write, and transformation capabilities.
 *
 * Provides safe dot-notation access, immutable mutations, format serialisation,
 * and introspection (`has`, `type`, `count`, `keys`).
 * All mutation methods are immutable — they return a new {@link AccessorInterface} instance.
 *
 * @remarks
 * **Cross-Language Note (GAP-006):** The PHP counterpart declares `static from(mixed $data): static`
 * (factory) and `clone(array $data = []): static` (copy-with-overrides) directly on
 * `AccessorInterface`. These are not part of this JS interface because JS factory functions
 * are defined at the module level (e.g. `SafeAccess.from()`). Consumers that need
 * language-portable construction semantics should use the package's exported factory.
 */
export interface AccessorInterface<T extends Record<string, unknown> = Record<string, unknown>> {
    // ── Read ──────────────────────────────────────────────────────────────

    /**
     * Retrieves a value at the given dot-notation path.
     *
     * **Cross-Language Sentinel:** When no `defaultValue` is supplied, this method returns
     * `undefined` for missing paths. The PHP counterpart returns `null` in the same case.
     * Consumers comparing absence across languages must account for this difference.
     *
     * @param path - Dot-notation path (e.g. `"user.profile.name"`).
     * @param defaultValue - Optional fallback value.
     * @returns The resolved value, or `defaultValue` / `undefined` if the path does not exist.
     */
    get(path: string, defaultValue?: unknown): unknown;

    /**
     * Fetches multiple paths at once.
     *
     * @param paths - Map of `{ path: defaultValue }` pairs.
     * @returns Map of `{ path: resolvedValue }` pairs.
     */
    getMany(paths: Record<string, unknown>): Record<string, unknown>;

    /**
     * Returns all internal data as a plain object.
     *
     * @returns Shallow copy of the underlying data structure.
     */
    all(): Record<string, unknown>;

    // ── Write (immutable) ─────────────────────────────────────────────────

    /**
     * Sets or creates a value at the specified path.
     *
     * @param path - Dot-notation path.
     * @param value - Value to set.
     * @returns New accessor instance with the change applied.
     */
    set(path: string, value: unknown): AccessorInterface<T>;

    /**
     * Removes the value at the specified path.
     *
     * @param path - Dot-notation path.
     * @returns New accessor instance without the path.
     */
    remove(path: string): AccessorInterface<T>;

    /**
     * Deep merges data at root level.
     *
     * @param value - Data to merge.
     * @returns New accessor instance.
     */
    merge(value: Record<string, unknown>): AccessorInterface<T>;

    /**
     * Deep merges data at a specific path.
     *
     * @param path - Dot-notation path.
     * @param value - Data to merge at the path.
     * @returns New accessor instance.
     */
    merge(path: string, value: Record<string, unknown>): AccessorInterface<T>;

    // ── Transform / Serialise ─────────────────────────────────────────────

    /**
     * Returns the data as a plain associative array/object.
     *
     * @returns A plain record of the underlying data.
     */
    toArray(): Record<string, unknown>;

    /**
     * Serialises data to a JSON string.
     *
     * @param pretty - When `true`, output is indented (default: 2 spaces; override via `options.space`).
     * @param options - Optional output controls: unescape unicode/slashes, custom indent.
     * @returns JSON string.
     */
    toJson(pretty?: boolean, options?: ToJsonOptions): string;

    // ── Introspection ─────────────────────────────────────────────────────

    /**
     * Checks whether a value exists at the given dot-notation path.
     *
     * @param path - Dot-notation path to check.
     * @returns `true` if the path resolves to a defined value.
     */
    has(path: string): boolean;

    /**
     * Returns the Normalized type of the value at the given path.
     *
     * @param path - Dot-notation path to inspect.
     * @returns One of `'string'`, `'number'`, `'boolean'`, `'array'`, `'object'`, `'null'`, or `null` if the path does not exist.
     */
    type(path: string): string | null;

    /**
     * Counts elements at the given level, or at root if no path is provided.
     *
     * @param path - Optional dot-notation path.
     * @returns Number of elements.
     */
    count(path?: string): number;

    /**
     * Lists available keys at the given level, or at root if no path is provided.
     *
     * @param path - Optional dot-notation path.
     * @returns Array of key names.
     */
    keys(path?: string): string[];
}
