import type { AccessorInterface } from './accessor.interface';
import type { DeepPaths, ValueAtPath } from '../types/deep-paths';

/**
 * Contract for immutable write operations on data structures.
 *
 * All methods return a new {@link AccessorInterface} instance — the original
 * data is never mutated.
 */
export interface WritableInterface<T extends Record<string, unknown> = Record<string, unknown>> {
    /**
     * Sets or creates a value at the specified path.
     *
     * @param path - Dot-notation path.
     * @param value - Value to set.
     * @returns New accessor instance with the change applied.
     */
    set<P extends DeepPaths<T> & string>(path: P, value: ValueAtPath<T, P>): AccessorInterface<T>;
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
}
