import { ArrayOperationsMixin } from './array-operations.mixin';

/**
 * @internal
 * Abstract mixin providing typed value accessors for {@link AbstractAccessor} subclasses.
 *
 * Extracted from `abstract-accessor.ts` to separate concerns.
 * Do not extend this class directly — use {@link AbstractAccessor}.
 */
export abstract class TypeCastingMixin extends ArrayOperationsMixin {
    /**
     * Retrieves a value at the given dot-notation path.
     *
     * Declared here so that type-casting helpers can call `this.get()`.
     * The full overloaded implementation lives in {@link AbstractAccessor}.
     *
     * @param path - Dot-notation path.
     * @param defaultValue - Fallback returned when the path does not exist.
     * @returns The value at `path`, or `defaultValue`.
     */
    abstract get(path: string, defaultValue?: unknown): unknown;

    /**
     * Retrieves multiple values at once.
     *
     * @param paths - Map of `{ path: defaultValue }` pairs.
     * @returns Map of `{ path: resolvedValue }` pairs.
     */
    getMany(paths: Record<string, unknown>): Record<string, unknown> {
        const results: Record<string, unknown> = {};
        for (const [path, defaultValue] of Object.entries(paths)) {
            results[path] = this.get(path, defaultValue);
        }
        return results;
    }

    /**
     * Retrieves the value at `path` coerced to an integer (`number`).
     *
     * Numeric strings such as `"42"` are coerced. Returns `defaultValue` when the
     * path is missing, the value is `null`/`undefined`, or the value is non-numeric.
     *
     * @param path - Dot-notation path.
     * @param defaultValue - Fallback integer (default `0`).
     * @returns The integer at `path`, or `defaultValue`.
     */
    getInt(path: string, defaultValue = 0): number {
        const val = this.get(path);
        if (val === null || val === undefined) return defaultValue;
        const n = typeof val === 'string' ? parseInt(val, 10) : Number(val);
        return isNaN(n) || !isFinite(n) ? defaultValue : Math.trunc(n);
    }

    /**
     * Retrieves the value at `path` coerced to a `boolean`.
     *
     * String representations are mapped: `"true"`, `"1"`, `"yes"` → `true`;
     * `"false"`, `"0"`, `"no"` → `false`. Numeric non-zero values are `true`.
     * Returns `defaultValue` when the path is missing or no mapping applies.
     *
     * @param path - Dot-notation path.
     * @param defaultValue - Fallback boolean (default `false`).
     * @returns The boolean at `path`, or `defaultValue`.
     */
    getBool(path: string, defaultValue = false): boolean {
        const val = this.get(path);
        if (val === null || val === undefined) return defaultValue;
        if (typeof val === 'boolean') return val;
        if (typeof val === 'number') return val !== 0;
        if (typeof val === 'string') {
            const lower = val.toLowerCase();
            if (lower === 'true' || lower === '1' || lower === 'yes') return true;
            if (lower === 'false' || lower === '0' || lower === 'no') return false;
        }
        return defaultValue;
    }

    /**
     * Retrieves the value at `path` coerced to a `string`.
     *
     * Returns `defaultValue` when the path is missing or the value is `null`/`undefined`.
     * All other values are converted via `String()`.
     *
     * @param path - Dot-notation path.
     * @param defaultValue - Fallback string (default `''`).
     * @returns The string at `path`, or `defaultValue`.
     */
    getString(path: string, defaultValue = ''): string {
        const val = this.get(path);
        if (val === null || val === undefined) return defaultValue;
        return String(val);
    }

    /**
     * Retrieves the value at `path` as an array.
     *
     * Returns `defaultValue` (default `[]`) when the path is missing or the value
     * is not already an array. Non-array values are **not** coerced.
     *
     * @param path - Dot-notation path.
     * @param defaultValue - Fallback array (default `[]`).
     * @returns The array at `path`, or `defaultValue`.
     */
    getArray<U = unknown>(path: string, defaultValue: U[] = []): U[] {
        const val = this.get(path);
        return Array.isArray(val) ? (val as U[]) : defaultValue;
    }

    /**
     * Retrieves the value at `path` coerced to a float (`number`).
     *
     * Numeric strings such as `"3.14"` are coerced. Returns `defaultValue` when the
     * path is missing, the value is `null`/`undefined`, or the value is non-numeric.
     *
     * @param path - Dot-notation path.
     * @param defaultValue - Fallback float (default `0`).
     * @returns The float at `path`, or `defaultValue`.
     */
    getFloat(path: string, defaultValue = 0): number {
        const val = this.get(path);
        if (val === null || val === undefined) return defaultValue;
        const n = typeof val === 'string' ? parseFloat(val) : Number(val);
        return isNaN(n) || !isFinite(n) ? defaultValue : n;
    }
}
