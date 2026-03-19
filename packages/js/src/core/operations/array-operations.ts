import { DotNotationParser } from '../parsers/dot-notation-parser';
import { InvalidFormatError } from '../../exceptions/invalid-format.error';

/**
 * Pure, immutable array operations on dot-notation paths.
 *
 * Every mutating method returns a new data record — the original is never modified.
 * This class is the TypeScript equivalent of the PHP `HasArrayOperations` trait.
 */
export class ArrayOperations {
    /**
     * Retrieves the array at a path or throws if the value is not an array.
     *
     * @param data - Root data record.
     * @param path - Dot-notation path to the array.
     * @returns The array found at the path.
     * @throws {@link InvalidFormatError} When the value at `path` is not an array.
     */
    private static ensureArray(data: Record<string, unknown>, path: string): unknown[] {
        const value = DotNotationParser.get(data, path);
        if (!Array.isArray(value)) {
            throw new InvalidFormatError(`Value at path '${path}' is not an array.`);
        }
        return value;
    }

    /**
     * Retrieves the array at a path, returning an empty array if absent or non-array.
     *
     * @param data - Root data record.
     * @param path - Dot-notation path.
     * @returns The array at the path, or `[]`.
     */
    private static getArrayOrEmpty(data: Record<string, unknown>, path: string): unknown[] {
        const value = DotNotationParser.get(data, path);
        return Array.isArray(value) ? value : [];
    }

    /**
     * Appends items to the end of the array at `path`.
     *
     * @param data - Root data record.
     * @param path - Dot-notation path to an array.
     * @param items - Items to append.
     * @returns New data record with the updated array.
     */
    static push(
        data: Record<string, unknown>,
        path: string,
        ...items: unknown[]
    ): Record<string, unknown> {
        const arr = this.ensureArray(data, path);
        return DotNotationParser.set(data, path, [...arr, ...items]);
    }

    /**
     * Removes the last item from the array at `path`.
     *
     * @param data - Root data record.
     * @param path - Dot-notation path to an array.
     * @returns New data record with the shortened array.
     */
    static pop(data: Record<string, unknown>, path: string): Record<string, unknown> {
        const arr = this.ensureArray(data, path);
        return DotNotationParser.set(data, path, arr.slice(0, -1));
    }

    /**
     * Removes the first item from the array at `path`.
     *
     * @param data - Root data record.
     * @param path - Dot-notation path to an array.
     * @returns New data record with the shortened array.
     */
    static shift(data: Record<string, unknown>, path: string): Record<string, unknown> {
        const arr = this.ensureArray(data, path);
        return DotNotationParser.set(data, path, arr.slice(1));
    }

    /**
     * Prepends items to the beginning of the array at `path`.
     *
     * @param data - Root data record.
     * @param path - Dot-notation path to an array.
     * @param items - Items to prepend.
     * @returns New data record with the updated array.
     */
    static unshift(
        data: Record<string, unknown>,
        path: string,
        ...items: unknown[]
    ): Record<string, unknown> {
        const arr = this.ensureArray(data, path);
        return DotNotationParser.set(data, path, [...items, ...arr]);
    }

    /**
     * Inserts items at a specific index within the array at `path`.
     *
     * Negative indices are clamped to 0.
     *
     * @param data - Root data record.
     * @param path - Dot-notation path to an array.
     * @param index - Position at which to insert (supports negative indices).
     * @param items - Items to insert.
     * @returns New data record with the updated array.
     */
    static insert(
        data: Record<string, unknown>,
        path: string,
        index: number,
        ...items: unknown[]
    ): Record<string, unknown> {
        const arr = this.ensureArray(data, path);
        const idx = index < 0 ? Math.max(0, arr.length + index) : index;
        return DotNotationParser.set(data, path, [
            ...arr.slice(0, idx),
            ...items,
            ...arr.slice(idx),
        ]);
    }

    /**
     * Filters the array at `path` using a predicate.
     *
     * @param data - Root data record.
     * @param path - Dot-notation path to an array.
     * @param predicate - Filter function applied to each element.
     * @returns New data record with the filtered array.
     */
    static filterAt(
        data: Record<string, unknown>,
        path: string,
        predicate: (item: unknown, index: number) => boolean,
    ): Record<string, unknown> {
        const arr = this.ensureArray(data, path);
        return DotNotationParser.set(data, path, arr.filter(predicate));
    }

    /**
     * Maps each element in the array at `path` through a transform function.
     *
     * @param data - Root data record.
     * @param path - Dot-notation path to an array.
     * @param transform - Mapping function applied to each element.
     * @returns New data record with the mapped array.
     */
    static mapAt(
        data: Record<string, unknown>,
        path: string,
        transform: (item: unknown, index: number) => unknown,
    ): Record<string, unknown> {
        const arr = this.ensureArray(data, path);
        return DotNotationParser.set(data, path, arr.map(transform));
    }

    /**
     * Sorts the array at `path` in ascending or descending order.
     *
     * When `key` is provided, sorts by the value of that property in each object element.
     *
     * @param data - Root data record.
     * @param path - Dot-notation path to an array.
     * @param key - Optional object key to sort by.
     * @param direction - Sort direction (`'asc'` or `'desc'`).
     * @returns New data record with the sorted array.
     */
    static sortAt(
        data: Record<string, unknown>,
        path: string,
        key?: string,
        direction: 'asc' | 'desc' = 'asc',
    ): Record<string, unknown> {
        const arr = [...this.ensureArray(data, path)];
        const dir = direction === 'desc' ? -1 : 1;
        arr.sort((a, b) => {
            const va = key ? (a as Record<string, unknown>)?.[key] : a;
            const vb = key ? (b as Record<string, unknown>)?.[key] : b;
            if (va === vb) return 0;
            if (va === undefined || va === null) return dir;
            if (vb === undefined || vb === null) return -dir;
            return va < vb ? -dir : dir;
        });
        return DotNotationParser.set(data, path, arr);
    }

    /**
     * Removes duplicate elements from the array at `path`.
     *
     * When `key` is provided, uniqueness is determined by the value of that property.
     *
     * @param data - Root data record.
     * @param path - Dot-notation path to an array.
     * @param key - Optional object key to base uniqueness on.
     * @returns New data record with the de-duplicated array.
     */
    static unique(
        data: Record<string, unknown>,
        path: string,
        key?: string,
    ): Record<string, unknown> {
        const arr = this.ensureArray(data, path);
        if (key) {
            const seen = new Set<unknown>();
            const result = arr.filter((item) => {
                const val = (item as Record<string, unknown>)?.[key];
                if (seen.has(val)) return false;
                seen.add(val);
                return true;
            });
            return DotNotationParser.set(data, path, result);
        }
        return DotNotationParser.set(data, path, [...new Set(arr)]);
    }

    /**
     * Flattens the array at `path` to the specified depth.
     *
     * @param data - Root data record.
     * @param path - Dot-notation path to an array.
     * @param depth - Flatten depth (default `1`).
     * @returns New data record with the flattened array.
     */
    static flatten(
        data: Record<string, unknown>,
        path: string,
        depth = 1,
    ): Record<string, unknown> {
        const arr = this.ensureArray(data, path);
        return DotNotationParser.set(data, path, arr.flat(depth));
    }

    /**
     * Returns the first element of the array at `path`.
     *
     * @param data - Root data record.
     * @param path - Dot-notation path to an array.
     * @param defaultValue - Value returned when the array is empty or absent.
     * @returns The first element, or `defaultValue`.
     */
    static first(
        data: Record<string, unknown>,
        path: string,
        defaultValue: unknown = null,
    ): unknown {
        const arr = this.getArrayOrEmpty(data, path);
        return arr.length > 0 ? arr[0] : defaultValue;
    }

    /**
     * Returns the last element of the array at `path`.
     *
     * @param data - Root data record.
     * @param path - Dot-notation path to an array.
     * @param defaultValue - Value returned when the array is empty or absent.
     * @returns The last element, or `defaultValue`.
     */
    static last(
        data: Record<string, unknown>,
        path: string,
        defaultValue: unknown = null,
    ): unknown {
        const arr = this.getArrayOrEmpty(data, path);
        return arr.length > 0 ? arr[arr.length - 1] : defaultValue;
    }

    /**
     * Returns the element at position `index` in the array at `path`.
     *
     * Negative indices count from the end.
     *
     * @param data - Root data record.
     * @param path - Dot-notation path to an array.
     * @param index - Position (supports negative indices).
     * @param defaultValue - Value returned when index is out of range.
     * @returns The element at the given index, or `defaultValue`.
     */
    static nth(
        data: Record<string, unknown>,
        path: string,
        index: number,
        defaultValue: unknown = null,
    ): unknown {
        const arr = this.getArrayOrEmpty(data, path);
        const idx = index < 0 ? arr.length + index : index;
        return idx >= 0 && idx < arr.length ? arr[idx] : defaultValue;
    }
}
