import type { ReadableInterface } from './readable.interface';
import type { TransformableInterface } from './transformable.interface';
import type { AbstractAccessor } from '../core/abstract-accessor';
import type { DeepPaths, ValueAtPath } from '../types/deep-paths';

/**
 * Complete accessor contract combining read, write, and transformation capabilities.
 *
 * Extends {@link ReadableInterface} and {@link TransformableInterface}, adding
 * introspection (`has`, `type`, `count`, `keys`) and mutation (`set`, `remove`, `merge`).
 * All mutation methods are immutable — they return a new {@link AbstractAccessor} instance.
 */
export interface AccessorInterface<T extends Record<string, unknown> = Record<string, unknown>>
    extends ReadableInterface<T>, TransformableInterface {
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

    /**
     * Sets or creates a value at the specified path.
     * Immutable: returns a new accessor with the change applied.
     *
     * @param path - Dot-notation path.
     * @param value - Value to set.
     * @returns New accessor instance.
     */
    set<P extends DeepPaths<T> & string>(path: P, value: ValueAtPath<T, P>): AbstractAccessor<T>;
    set(path: string, value: unknown): AbstractAccessor<T>;

    /**
     * Removes the value at the specified path.
     * Immutable: returns a new accessor without the path.
     *
     * @param path - Dot-notation path.
     * @returns New accessor instance.
     */
    remove(path: string): AbstractAccessor<T>;

    /**
     * Deep merges data at root or at a specific path.
     * Immutable: returns a new accessor with the merge applied.
     *
     * @param value - Data to merge at root.
     * @returns New accessor instance.
     */
    merge(value: Record<string, unknown>): AbstractAccessor<T>;

    /**
     * Deep merges data at a specific path.
     * Immutable: returns a new accessor with the merge applied.
     *
     * @param path - Dot-notation path.
     * @param value - Data to merge at the path.
     * @returns New accessor instance.
     */
    merge(path: string, value: Record<string, unknown>): AbstractAccessor<T>;
}
