import { FilterParser } from './filter-parser';
import type { FilterExpression } from './filter-parser';

/**
 * Segment types returned by parseSegments().
 */
type Segment =
    | { type: 'key'; value: string }
    | { type: 'wildcard' }
    | { type: 'filter'; expression: FilterExpression }
    | { type: 'descent'; key: string };

/**
 * Core engine for resolving paths with dot notation.
 * Functional equivalent of the PHP version.
 */
export class DotNotationParser {
    /**
     * Accesses a value in a nested structure via dot notation.
     */
    static get(data: Record<string, unknown>, path: string, defaultValue: unknown = null): unknown {
        if (path === '') return defaultValue;

        const segments = DotNotationParser.parseSegments(path);
        return DotNotationParser.resolve(data, segments, 0, defaultValue);
    }

    private static resolve(
        current: unknown,
        segments: Segment[],
        index: number,
        defaultValue: unknown,
    ): unknown {
        if (index >= segments.length) return current;

        const segment = segments[index];

        if (segment.type === 'descent') {
            return DotNotationParser.resolveDescent(
                current,
                segment.key,
                segments,
                index + 1,
                defaultValue,
            );
        }

        if (segment.type === 'wildcard') {
            const items = DotNotationParser.toIterable(current);
            if (items === null) return defaultValue;

            const remaining = segments.slice(index + 1);
            if (remaining.length === 0) return [...items];

            return items.map((item) => DotNotationParser.resolve(item, remaining, 0, defaultValue));
        }

        if (segment.type === 'filter') {
            const items = DotNotationParser.toIterable(current);
            if (items === null) return defaultValue;

            const filtered = items.filter(
                (item) =>
                    typeof item === 'object' &&
                    item !== null &&
                    FilterParser.evaluate(item as Record<string, unknown>, segment.expression),
            );

            const remaining = segments.slice(index + 1);
            if (remaining.length === 0) return filtered;

            return filtered.map((item) =>
                DotNotationParser.resolve(item, remaining, 0, defaultValue),
            );
        }

        // type === 'key'
        if (
            current !== null &&
            typeof current === 'object' &&
            segment.value in (current as Record<string, unknown>)
        ) {
            return DotNotationParser.resolve(
                (current as Record<string, unknown>)[segment.value],
                segments,
                index + 1,
                defaultValue,
            );
        }
        return defaultValue;
    }

    private static toIterable(current: unknown): unknown[] | null {
        if (Array.isArray(current)) return current;
        if (typeof current === 'object' && current !== null) {
            return Object.values(current as Record<string, unknown>);
        }
        return null;
    }

    private static resolveDescent(
        current: unknown,
        key: string,
        segments: Segment[],
        nextIndex: number,
        defaultValue: unknown,
    ): unknown[] {
        const results: unknown[] = [];
        DotNotationParser.collectDescent(current, key, segments, nextIndex, defaultValue, results);
        return results;
    }

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
                const resolved = DotNotationParser.resolve(
                    obj[key],
                    segments,
                    nextIndex,
                    defaultValue,
                );
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
                DotNotationParser.collectDescent(
                    child,
                    key,
                    segments,
                    nextIndex,
                    defaultValue,
                    results,
                );
            }
        }
    }

    /**
     * Checks whether a path exists.
     */
    static has(data: Record<string, unknown>, path: string): boolean {
        const sentinel = Symbol('sentinel');
        return DotNotationParser.get(data, path, sentinel) !== sentinel;
    }

    /**
     * Sets a value via dot notation (returns a new object — immutable).
     */
    static set(
        data: Record<string, unknown>,
        path: string,
        value: unknown,
    ): Record<string, unknown> {
        const keys = DotNotationParser.parseKeys(path);
        const result = structuredClone(data);
        let current: Record<string, unknown> = result;

        for (let i = 0; i < keys.length - 1; i++) {
            const key = keys[i];
            if (!(key in current) || typeof current[key] !== 'object' || current[key] === null) {
                current[key] = {};
            }
            current = current[key] as Record<string, unknown>;
        }

        current[keys[keys.length - 1]] = value;
        return result;
    }

    /**
     * Deep merges a value at a path (returns a new object — immutable).
     * Objects are merged recursively; all other values are replaced.
     */
    static merge(
        data: Record<string, unknown>,
        path: string,
        value: Record<string, unknown>,
    ): Record<string, unknown> {
        const existing = path ? DotNotationParser.get(data, path, {}) : data;
        const merged = DotNotationParser.deepMerge(
            typeof existing === 'object' && existing !== null && !Array.isArray(existing)
                ? (existing as Record<string, unknown>)
                : {},
            value,
        );
        return path ? DotNotationParser.set(data, path, merged) : structuredClone(merged);
    }

    /**
     * Recursively merges source into target. Objects are merged; other values are replaced.
     */
    private static deepMerge(
        target: Record<string, unknown>,
        source: Record<string, unknown>,
    ): Record<string, unknown> {
        const result = structuredClone(target);
        for (const key of Object.keys(source)) {
            const srcVal = source[key];
            const tgtVal = result[key];
            if (
                typeof srcVal === 'object' &&
                srcVal !== null &&
                !Array.isArray(srcVal) &&
                typeof tgtVal === 'object' &&
                tgtVal !== null &&
                !Array.isArray(tgtVal)
            ) {
                result[key] = DotNotationParser.deepMerge(
                    tgtVal as Record<string, unknown>,
                    srcVal as Record<string, unknown>,
                );
            } else {
                result[key] = structuredClone(srcVal);
            }
        }
        return result;
    }

    /**
     * Removes a path (returns a new object — immutable).
     */
    static remove(data: Record<string, unknown>, path: string): Record<string, unknown> {
        const keys = DotNotationParser.parseKeys(path);
        const result = structuredClone(data);
        let current: Record<string, unknown> = result;

        for (let i = 0; i < keys.length - 1; i++) {
            const key = keys[i];
            if (!(key in current) || typeof current[key] !== 'object' || current[key] === null) {
                return result;
            }
            current = current[key] as Record<string, unknown>;
        }

        delete current[keys[keys.length - 1]];
        return result;
    }

    /**
     * Parses a path into typed segments for the get() engine.
     * Supports: keys, wildcards (*), filters ([?...]), and recursive descent (..).
     */
    private static parseSegments(path: string): Segment[] {
        const segments: Segment[] = [];
        let i = 0;

        while (i < path.length) {
            // Skip leading dot
            if (path[i] === '.') {
                // Recursive descent: ".."
                if (i + 1 < path.length && path[i + 1] === '.') {
                    i += 2;
                    // Collect the key after ".."
                    let key = '';
                    while (i < path.length && path[i] !== '.' && path[i] !== '[') {
                        if (path[i] === '\\' && i + 1 < path.length && path[i + 1] === '.') {
                            key += '.';
                            i += 2;
                        } else {
                            key += path[i];
                            i++;
                        }
                    }
                    if (key) segments.push({ type: 'descent', key });
                    continue;
                }
                i++;
                continue;
            }

            // Filter: [?...]
            if (path[i] === '[' && i + 1 < path.length && path[i + 1] === '?') {
                let depth = 1;
                let j = i + 1;
                while (j < path.length && depth > 0) {
                    j++;
                    if (path[j] === '[') depth++;
                    if (path[j] === ']') depth--;
                }
                const filterExpr = path.substring(i + 2, j);
                segments.push({ type: 'filter', expression: FilterParser.parse(filterExpr) });
                i = j + 1;
                continue;
            }

            // Index: [0]
            if (path[i] === '[') {
                let j = i + 1;
                while (j < path.length && path[j] !== ']') j++;
                segments.push({ type: 'key', value: path.substring(i + 1, j) });
                i = j + 1;
                continue;
            }

            // Wildcard
            if (path[i] === '*') {
                segments.push({ type: 'wildcard' });
                i++;
                continue;
            }

            // Regular key
            let key = '';
            while (i < path.length && path[i] !== '.' && path[i] !== '[') {
                if (path[i] === '\\' && i + 1 < path.length && path[i + 1] === '.') {
                    key += '.';
                    i += 2;
                } else {
                    key += path[i];
                    i++;
                }
            }
            /* v8 ignore next */
            if (key) segments.push({ type: 'key', value: key });
        }

        return segments;
    }

    /**
     * Parses a path into an array of keys.
     */
    private static parseKeys(path: string): string[] {
        // Convert brackets: "a[0][1]" → "a.0.1"
        const normalized = path.replace(/\[([^\]]+)\]/g, '.$1');

        // Split by "." respecting escaped "\."
        const placeholder = '\x00ESC_DOT\x00';
        const escaped = normalized.replace(/\\\./g, placeholder);
        const keys = escaped.split('.');

        const placeholderRegex = new RegExp(
            placeholder.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'),
            'g',
        );
        return keys.map((k) => k.replace(placeholderRegex, '.'));
    }
}
