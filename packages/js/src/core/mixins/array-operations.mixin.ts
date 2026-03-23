import { ArrayOperations } from '../operations/array-operations';
import { DotNotationParser } from '../parsers/dot-notation-parser';
import { PathResolver } from '../resolvers/path-resolver';
import type { CompiledPath } from '../../types/compiled-path';

/**
 * @internal
 * Abstract mixin providing array mutation wrappers and low-level segment/compiled-path
 * accessors for {@link AbstractAccessor} subclasses.
 *
 * Extracted from `abstract-accessor.ts` to separate concerns.
 * Do not extend this class directly — use {@link AbstractAccessor}.
 */
export abstract class ArrayOperationsMixin {
    /** @internal Internal data record accessed by array operation methods. */
    protected abstract data: Record<string, unknown>;

    /**
     * Creates a new accessor from mutated `newData`.
     *
     * Guarding against readonly violations is the responsibility of the concrete implementation.
     *
     * @internal
     */
    protected abstract mutate(newData: Record<string, unknown>): this;

    // ── Compiled & segment-based paths ───────────────────────────────────────

    /**
     * Retrieves a value using a pre-compiled path, bypassing path tokenization.
     *
     * Use {@link SafeAccess.compilePath} to create a `CompiledPath` once, then call
     * `getCompiled` repeatedly across different accessors or iterations for best
     * performance.
     *
     * @param compiledPath - Pre-compiled path from {@link SafeAccess.compilePath}.
     * @param defaultValue - Fallback when the path does not exist.
     * @returns The value at the compiled path, or `defaultValue`.
     */
    getCompiled(compiledPath: CompiledPath, defaultValue: unknown = null): unknown {
        return PathResolver.resolve(this.data, compiledPath._segments, 0, defaultValue);
    }

    /**
     * Retrieves a value at the given literal path segments (no dot-notation parsing).
     *
     * @param segments - Array of plain key strings forming the path.
     * @param defaultValue - Fallback value when the path does not exist.
     * @returns The resolved value, or `defaultValue`.
     */
    getAt(segments: string[], defaultValue: unknown = null): unknown {
        return DotNotationParser.getBySegments(this.data, segments, defaultValue);
    }

    /**
     * Checks whether a value exists at the given literal path segments.
     *
     * @param segments - Array of plain key strings forming the path.
     * @returns `true` if the path resolves to a defined value.
     */
    hasAt(segments: string[]): boolean {
        const sentinel = Symbol('sentinel');
        return DotNotationParser.getBySegments(this.data, segments, sentinel) !== sentinel;
    }

    /**
     * Sets a value at the given literal path segments. Returns a new accessor.
     *
     * @param segments - Array of plain key strings forming the path.
     * @param value - Value to assign at the terminal segment.
     * @returns A new accessor with the value set.
     */
    setAt(segments: string[], value: unknown): this {
        return this.mutate(DotNotationParser.setBySegments(this.data, segments, value));
    }

    /**
     * Removes the value at the given literal path segments. Returns a new accessor.
     *
     * @param segments - Array of plain key strings forming the path.
     * @returns A new accessor without the terminal segment.
     */
    removeAt(segments: string[]): this {
        return this.mutate(DotNotationParser.removeBySegments(this.data, segments));
    }

    // ── Array mutations ───────────────────────────────────────────────────────

    /**
     * Appends items to the array at `path`.
     *
     * @param path - Dot-notation path to an array.
     * @param items - Items to append.
     * @returns A new accessor with the updated array.
     */
    push(path: string, ...items: unknown[]): this {
        return this.mutate(ArrayOperations.push(this.data, path, ...items));
    }

    /**
     * Removes the last element of the array at `path`.
     *
     * @param path - Dot-notation path to an array.
     * @returns A new accessor with the shortened array.
     */
    pop(path: string): this {
        return this.mutate(ArrayOperations.pop(this.data, path));
    }

    /**
     * Removes the first element of the array at `path`.
     *
     * @param path - Dot-notation path to an array.
     * @returns A new accessor with the shortened array.
     */
    shift(path: string): this {
        return this.mutate(ArrayOperations.shift(this.data, path));
    }

    /**
     * Prepends items to the array at `path`.
     *
     * @param path - Dot-notation path to an array.
     * @param items - Items to prepend.
     * @returns A new accessor with the updated array.
     */
    unshift(path: string, ...items: unknown[]): this {
        return this.mutate(ArrayOperations.unshift(this.data, path, ...items));
    }

    /**
     * Inserts items at `index` within the array at `path`.
     *
     * @param path - Dot-notation path to an array.
     * @param index - Position at which to insert (negative counts from the end).
     * @param items - Items to insert.
     * @returns A new accessor with the updated array.
     */
    insert(path: string, index: number, ...items: unknown[]): this {
        return this.mutate(ArrayOperations.insert(this.data, path, index, ...items));
    }

    /**
     * Filters the array at `path` using `predicate`.
     *
     * @param path - Dot-notation path to an array.
     * @param predicate - Function receiving each element and its index; return `true` to keep.
     * @returns A new accessor with the filtered array.
     */
    filterAt(path: string, predicate: (item: unknown, index: number) => boolean): this {
        return this.mutate(ArrayOperations.filterAt(this.data, path, predicate));
    }

    /**
     * Maps each element of the array at `path` through `transform`.
     *
     * @param path - Dot-notation path to an array.
     * @param transform - Function receiving each element and its index; returns the replacement.
     * @returns A new accessor with the mapped array.
     */
    mapAt(path: string, transform: (item: unknown, index: number) => unknown): this {
        return this.mutate(ArrayOperations.mapAt(this.data, path, transform));
    }

    /**
     * Sorts the array at `path`.
     *
     * @param path - Dot-notation path to an array.
     * @param key - Optional object key to sort by.
     * @param direction - Sort direction (`'asc'` or `'desc'`, default `'asc'`).
     * @returns A new accessor with the sorted array.
     */
    sortAt(path: string, key?: string, direction: 'asc' | 'desc' = 'asc'): this {
        return this.mutate(ArrayOperations.sortAt(this.data, path, key, direction));
    }

    /**
     * Removes duplicate elements from the array at `path`.
     *
     * @param path - Dot-notation path to an array.
     * @param key - Optional object key to base uniqueness on.
     * @returns A new accessor with de-duplicated elements.
     */
    unique(path: string, key?: string): this {
        return this.mutate(ArrayOperations.unique(this.data, path, key));
    }

    /**
     * Flattens the array at `path` to the given `depth`.
     *
     * @param path - Dot-notation path to an array.
     * @param depth - Flatten depth (default `1`).
     * @returns A new accessor with the flattened array.
     */
    flatten(path: string, depth = 1): this {
        return this.mutate(ArrayOperations.flatten(this.data, path, depth));
    }

    /**
     * Returns the first element of the array at `path`.
     *
     * @param path - Dot-notation path to an array.
     * @param defaultValue - Fallback when the array is empty or absent.
     * @returns The first element, or `defaultValue`.
     */
    first(path: string, defaultValue: unknown = null): unknown {
        return ArrayOperations.first(this.data, path, defaultValue);
    }

    /**
     * Returns the last element of the array at `path`.
     *
     * @param path - Dot-notation path to an array.
     * @param defaultValue - Fallback when the array is empty or absent.
     * @returns The last element, or `defaultValue`.
     */
    last(path: string, defaultValue: unknown = null): unknown {
        return ArrayOperations.last(this.data, path, defaultValue);
    }

    /**
     * Returns the element at position `index` within the array at `path`.
     *
     * Negative indices count from the end.
     *
     * @param path - Dot-notation path to an array.
     * @param index - Position (negative counts from end).
     * @param defaultValue - Fallback when index is out of range.
     * @returns The element at `index`, or `defaultValue`.
     */
    nth(path: string, index: number, defaultValue: unknown = null): unknown {
        return ArrayOperations.nth(this.data, path, index, defaultValue);
    }
}
