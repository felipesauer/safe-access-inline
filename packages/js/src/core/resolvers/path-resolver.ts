import { FilterParser } from '../parsers/filter-parser';
import { SegmentType } from '../../enums/segment-type.enum';
import { assertMaxDepth } from '../../security/guards/security-options';
import type { Segment } from '../parsers/segment-parser';

/**
 * Recursive path resolution engine for dot-notation segments.
 *
 * Handles wildcard expansion, filter evaluation, recursive descent,
 * multi-index, and slice operations. Called exclusively by
 * {@link DotNotationParser.get}.
 */
export class PathResolver {
    /**
     * Recursively resolves a value by walking the segment array.
     *
     * @param current      - Current node in the data tree.
     * @param segments     - Parsed segment array.
     * @param index        - Current position in the segment array.
     * @param defaultValue - Value returned when the path does not exist.
     * @returns The resolved value, or `defaultValue`.
     */
    static resolve(
        current: unknown,
        segments: Segment[],
        index: number,
        defaultValue: unknown,
    ): unknown {
        assertMaxDepth(index);
        if (index >= segments.length) return current;

        const segment = segments[index];

        if (segment.type === SegmentType.DESCENT) {
            return PathResolver.resolveDescent(
                current,
                segment.key,
                segments,
                index + 1,
                defaultValue,
            );
        }

        if (segment.type === SegmentType.DESCENT_MULTI) {
            const results: unknown[] = [];
            for (const key of segment.keys) {
                PathResolver.collectDescent(
                    current,
                    key,
                    segments,
                    index + 1,
                    defaultValue,
                    results,
                );
            }
            return results.length > 0 ? results : defaultValue;
        }

        if (segment.type === SegmentType.WILDCARD) {
            const items = PathResolver.toIterable(current);
            if (items === null) return defaultValue;

            const nextIndex = index + 1;
            if (nextIndex >= segments.length) return [...items];

            return items.map((item) =>
                PathResolver.resolve(item, segments, nextIndex, defaultValue),
            );
        }

        if (segment.type === SegmentType.FILTER) {
            const items = PathResolver.toIterable(current);
            if (items === null) return defaultValue;

            const filtered = items.filter(
                (item) =>
                    typeof item === 'object' &&
                    item !== null &&
                    FilterParser.evaluate(item as Record<string, unknown>, segment.expression),
            );

            const nextIndex = index + 1;
            if (nextIndex >= segments.length) return filtered;

            return filtered.map((item) =>
                PathResolver.resolve(item, segments, nextIndex, defaultValue),
            );
        }

        if (segment.type === SegmentType.MULTI_KEY) {
            // Multi-key: pick named keys from object
            if (current === null || typeof current !== 'object') return defaultValue;
            const obj = current as Record<string, unknown>;
            const nextIndex = index + 1;
            const results = segment.keys.map((k) => {
                const val = k in obj ? obj[k] : defaultValue;
                if (nextIndex >= segments.length) return val;
                return PathResolver.resolve(val, segments, nextIndex, defaultValue);
            });
            return results;
        }

        if (segment.type === SegmentType.MULTI_INDEX) {
            const nextIndex = index + 1;
            // Numeric multi-index
            const items = PathResolver.toIterable(current);
            if (items === null) return defaultValue;
            const results = segment.indices.map((idx) => {
                const resolved = idx < 0 ? items[items.length + idx] : items[idx];
                if (resolved === undefined) return defaultValue;
                if (nextIndex >= segments.length) return resolved;
                return PathResolver.resolve(resolved, segments, nextIndex, defaultValue);
            });
            return results;
        }

        if (segment.type === SegmentType.SLICE) {
            const items = PathResolver.toIterable(current);
            if (items === null) return defaultValue;
            const len = items.length;
            const step = segment.step ?? 1;
            let start = segment.start ?? (step > 0 ? 0 : len - 1);
            let end = segment.end ?? (step > 0 ? len : -len - 1);
            if (start < 0) start = Math.max(len + start, 0);
            if (end < 0) end = len + end;
            if (start >= len) start = len;
            if (end > len) end = len;
            const sliced: unknown[] = [];
            if (step > 0) {
                for (let si = start; si < end; si += step) sliced.push(items[si]);
            } else {
                for (let si = start; si > end; si += step) sliced.push(items[si]);
            }
            const nextIndex = index + 1;
            if (nextIndex >= segments.length) return sliced;
            return sliced.map((item) =>
                PathResolver.resolve(item, segments, nextIndex, defaultValue),
            );
        }

        // type === SegmentType.KEY
        if (
            current !== null &&
            typeof current === 'object' &&
            segment.value in (current as Record<string, unknown>)
        ) {
            return PathResolver.resolve(
                (current as Record<string, unknown>)[segment.value],
                segments,
                index + 1,
                defaultValue,
            );
        }
        return defaultValue;
    }

    /**
     * Converts a value to an iterable array of entries.
     *
     * @param current - Value to convert.
     * @returns Array of values, or `null` if not iterable.
     */
    static toIterable(current: unknown): unknown[] | null {
        if (Array.isArray(current)) return current;
        if (typeof current === 'object' && current !== null) {
            return Object.values(current as Record<string, unknown>);
        }
        return null;
    }

    /**
     * Initiates a recursive descent search for `key` starting at `current`.
     *
     * @param current - The node to start the descent from.
     * @param key - The key to search for recursively.
     * @param segments - Remaining segments to resolve after the descent key is found.
     * @param nextIndex - Index into `segments` for post-descent resolution.
     * @param defaultValue - Fallback value passed through to sub-resolutions.
     * @returns Array of all values found via recursive descent.
     */
    private static resolveDescent(
        current: unknown,
        key: string,
        segments: Segment[],
        nextIndex: number,
        defaultValue: unknown,
    ): unknown[] {
        const results: unknown[] = [];
        PathResolver.collectDescent(current, key, segments, nextIndex, defaultValue, results);
        return results;
    }

    /**
     * Recursively traverses the object graph and collects all values reachable at `key`.
     *
     * Appends matching results to `results` in place; also recurses into all child
     * objects and array elements to implement the `..key` (recursive descent) operator.
     *
     * @param current - The current node being traversed.
     * @param key - The key to match at each level.
     * @param segments - Remaining segments to resolve once a match is found.
     * @param nextIndex - Index into `segments` for post-match resolution.
     * @param defaultValue - Fallback value passed through to sub-resolutions.
     * @param results - Accumulator array; matching values are appended here.
     */
    private static collectDescent(
        current: unknown,
        key: string,
        segments: Segment[],
        nextIndex: number,
        defaultValue: unknown,
        results: unknown[],
    ): void {
        if (current === null || typeof current !== 'object') return;

        const obj = current as Record<string, unknown>;

        if (key in obj) {
            if (nextIndex >= segments.length) {
                results.push(obj[key]);
            } else {
                const resolved = PathResolver.resolve(obj[key], segments, nextIndex, defaultValue);
                if (Array.isArray(resolved)) {
                    results.push(...resolved);
                } else {
                    results.push(resolved);
                }
            }
        }

        const values = Array.isArray(current) ? current : Object.values(obj);
        for (const child of values) {
            if (typeof child === 'object' && child !== null) {
                PathResolver.collectDescent(child, key, segments, nextIndex, defaultValue, results);
            }
        }
    }
}
