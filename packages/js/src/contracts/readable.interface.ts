import type { DeepPaths, ValueAtPath } from '../types/deep-paths';

/**
 * Contract for read-only data access via dot-notation paths.
 *
 * Provides safe value retrieval that never throws on missing paths —
 * returns the provided default value instead.
 */
export interface ReadableInterface<T extends Record<string, unknown> = Record<string, unknown>> {
    /**
     * Retrieves a value at the given dot-notation path with full type inference.
     *
     * @param path - Dot-notation path (e.g. `"user.profile.name"`).
     * @returns The resolved value, or `undefined` if the path does not exist.
     */
    get<P extends DeepPaths<T> & string>(path: P): ValueAtPath<T, P>;

    /**
     * Retrieves a value at the given path, returning `defaultValue` if the path is missing.
     *
     * @param path - Dot-notation path.
     * @param defaultValue - Fallback value.
     * @returns The resolved value, or `defaultValue`.
     */
    get<P extends DeepPaths<T> & string>(
        path: P,
        defaultValue: ValueAtPath<T, P>,
    ): ValueAtPath<T, P>;

    /**
     * Untyped overload for dynamic path access.
     *
     * @param path - Dot-notation path.
     * @param defaultValue - Optional fallback.
     * @returns The resolved value.
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
     * Resolves a template path by substituting `{key}` placeholders, then retrieves the value.
     *
     * @param template - Path template with `{key}` placeholders (e.g. `'users.{id}.name'`).
     * @param bindings - Key-value pairs to substitute into the template.
     * @param defaultValue - Fallback when the resolved path does not exist.
     * @returns The value at the resolved path, or `defaultValue`.
     */
    getTemplate(
        template: string,
        bindings: Record<string, string | number>,
        defaultValue?: unknown,
    ): unknown;

    /**
     * Returns all internal data as a plain object.
     *
     * @returns Shallow copy of the underlying data structure.
     */
    all(): Record<string, unknown>;
}
