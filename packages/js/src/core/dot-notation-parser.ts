import { FilterParser } from './filter-parser';
import type { FilterExpression } from './filter-parser';
import { SecurityGuard } from './security-guard';
import { PathCache } from './path-cache';
import { assertMaxDepth } from './security-options';
import { deepMerge } from './deep-merger';

/**
 * Segment types returned by parseSegments().
 */
type Segment =
    | { type: 'key'; value: string }
    | { type: 'wildcard' }
    | { type: 'filter'; expression: FilterExpression }
    | { type: 'descent'; key: string }
    | { type: 'descent-multi'; keys: string[] }
    | { type: 'multi-index'; indices: number[] }
    | { type: 'slice'; start: number | null; end: number | null; step: number | null };

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

        const segments = DotNotationParser.cachedParseSegments(path);
        return DotNotationParser.resolve(data, segments, 0, defaultValue);
    }

    private static cachedParseSegments(path: string): Segment[] {
        const cached = PathCache.get(path);
        if (cached) return cached as Segment[];
        const segments = DotNotationParser.parseSegments(path);
        PathCache.set(path, segments);
        return segments;
    }

    private static resolve(
        current: unknown,
        segments: Segment[],
        index: number,
        defaultValue: unknown,
    ): unknown {
        assertMaxDepth(index);
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

        if (segment.type === 'descent-multi') {
            const results: unknown[] = [];
            for (const key of segment.keys) {
                DotNotationParser.collectDescent(
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

        if (segment.type === 'wildcard') {
            const items = DotNotationParser.toIterable(current);
            if (items === null) return defaultValue;

            const nextIndex = index + 1;
            if (nextIndex >= segments.length) return [...items];

            return items.map((item) =>
                DotNotationParser.resolve(item, segments, nextIndex, defaultValue),
            );
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

            const nextIndex = index + 1;
            if (nextIndex >= segments.length) return filtered;

            return filtered.map((item) =>
                DotNotationParser.resolve(item, segments, nextIndex, defaultValue),
            );
        }

        if (segment.type === 'multi-index') {
            const nextIndex = index + 1;
            const multiKeys = (segment as unknown as { keys?: string[] }).keys;
            if (multiKeys) {
                // Multi-key: pick named keys from object
                if (current === null || typeof current !== 'object') return defaultValue;
                const obj = current as Record<string, unknown>;
                const results = multiKeys.map((k) => {
                    const val = k in obj ? obj[k] : defaultValue;
                    if (nextIndex >= segments.length) return val;
                    return DotNotationParser.resolve(val, segments, nextIndex, defaultValue);
                });
                return results;
            }
            // Numeric multi-index
            const items = DotNotationParser.toIterable(current);
            if (items === null) return defaultValue;
            const results = segment.indices.map((idx) => {
                const resolved = idx < 0 ? items[items.length + idx] : items[idx];
                if (resolved === undefined) return defaultValue;
                if (nextIndex >= segments.length) return resolved;
                return DotNotationParser.resolve(resolved, segments, nextIndex, defaultValue);
            });
            return results;
        }

        if (segment.type === 'slice') {
            const items = DotNotationParser.toIterable(current);
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
                DotNotationParser.resolve(item, segments, nextIndex, defaultValue),
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
        const result: Record<string, unknown> = { ...data };
        let current: Record<string, unknown> = result;

        for (let i = 0; i < keys.length - 1; i++) {
            const key = keys[i];
            SecurityGuard.assertSafeKey(key);
            const child = current[key];
            if (!(key in current) || typeof child !== 'object' || child === null) {
                current[key] = {};
            } else {
                current[key] = Array.isArray(child)
                    ? [...child]
                    : { ...(child as Record<string, unknown>) };
            }
            current = current[key] as Record<string, unknown>;
        }

        SecurityGuard.assertSafeKey(keys[keys.length - 1]);
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
     * Recursively merges source into target. Delegates to the shared deepMerge utility
     * to avoid logic duplication (see ARCH-005).
     */
    private static deepMerge(
        target: Record<string, unknown>,
        source: Record<string, unknown>,
    ): Record<string, unknown> {
        return deepMerge(target, source);
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
     * Supports: keys, wildcards (*), filters ([?...]), recursive descent (..),
     * multi-index ([0,1,2]), slice ([0:5], [::2]), bracket notation (['key']),
     * and root anchor ($).
     */
    private static parseSegments(path: string): Segment[] {
        const segments: Segment[] = [];
        let i = 0;

        // Strip root anchor $
        if (path.startsWith('$')) {
            i = 1;
            if (i < path.length && path[i] === '.') i++;
        }

        while (i < path.length) {
            // Skip leading dot
            if (path[i] === '.') {
                // Recursive descent: ".."
                if (i + 1 < path.length && path[i + 1] === '.') {
                    i += 2;
                    // Check for bracket notation after ".." → ..['key1','key2']
                    if (i < path.length && path[i] === '[') {
                        let j = i + 1;
                        while (j < path.length && path[j] !== ']') j++;
                        const inner = path.substring(i + 1, j);
                        i = j + 1;
                        if (inner.includes(',')) {
                            const parts = inner.split(',').map((p) => p.trim());
                            const allQuoted = parts.every(
                                (p) =>
                                    (p.startsWith("'") && p.endsWith("'")) ||
                                    (p.startsWith('"') && p.endsWith('"')),
                            );
                            if (allQuoted) {
                                const keys = parts.map((p) => p.slice(1, -1));
                                segments.push({ type: 'descent-multi', keys });
                                continue;
                            }
                        }
                        // Single quoted key after ..
                        const quotedMatch = inner.match(/^(['"])(.*?)\1$/);
                        if (quotedMatch) {
                            segments.push({ type: 'descent', key: quotedMatch[2] });
                            continue;
                        }
                        // Unquoted key in brackets
                        segments.push({ type: 'descent', key: inner });
                        continue;
                    }
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

            // Bracket notation: [0], [0,1,2], [0:5], ['key'], ["key"]
            if (path[i] === '[') {
                let j = i + 1;
                while (j < path.length && path[j] !== ']') j++;
                const inner = path.substring(i + 1, j);
                i = j + 1;

                // Multi-index: [0,1,2] or multi-key: ['a','b'] — check before single-quoted
                if (inner.includes(',')) {
                    const parts = inner.split(',').map((p) => p.trim());
                    // Check if all parts are quoted strings (multi-key)
                    const allQuoted = parts.every(
                        (p) =>
                            (p.startsWith("'") && p.endsWith("'")) ||
                            (p.startsWith('"') && p.endsWith('"')),
                    );
                    if (allQuoted) {
                        const keys = parts.map((p) => p.slice(1, -1));
                        segments.push({
                            type: 'multi-index',
                            indices: keys as unknown as number[],
                        });
                        (segments[segments.length - 1] as unknown as { keys: string[] }).keys =
                            keys;
                        continue;
                    }
                    const indices = parts.map((p) => parseInt(p, 10));
                    if (indices.every((n) => !isNaN(n))) {
                        segments.push({ type: 'multi-index', indices });
                        continue;
                    }
                }

                // Quoted bracket key: ['key'] or ["key"]
                const quotedMatch = inner.match(/^(['"])(.*?)\1$/);
                if (quotedMatch) {
                    segments.push({ type: 'key', value: quotedMatch[2] });
                    continue;
                }

                // Slice: [start:end:step]
                if (inner.includes(':')) {
                    const sliceParts = inner.split(':');
                    const start = sliceParts[0] !== '' ? parseInt(sliceParts[0], 10) : null;
                    const end =
                        sliceParts.length > 1 && sliceParts[1] !== ''
                            ? parseInt(sliceParts[1], 10)
                            : null;
                    const step =
                        sliceParts.length > 2 && sliceParts[2] !== ''
                            ? parseInt(sliceParts[2], 10)
                            : null;
                    segments.push({ type: 'slice', start, end, step });
                    continue;
                }

                // Regular index/key
                segments.push({ type: 'key', value: inner });
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
            // key is always non-empty here: the outer loop only falls through to this section
            // when path[i] is not '.', '[', or '*', guaranteeing at least one iteration above.
            segments.push({ type: 'key', value: key });
        }

        return segments;
    }

    /**
     * Literal segment navigation — no wildcards, no filters, no descent.
     */
    static getBySegments(
        data: Record<string, unknown>,
        segments: string[],
        defaultValue: unknown = null,
    ): unknown {
        let current: unknown = data;
        for (const segment of segments) {
            if (current === null || current === undefined || typeof current !== 'object') {
                return defaultValue;
            }
            if (!(segment in (current as Record<string, unknown>))) {
                return defaultValue;
            }
            current = (current as Record<string, unknown>)[segment];
        }
        return current;
    }

    static setBySegments(
        data: Record<string, unknown>,
        segments: string[],
        value: unknown,
    ): Record<string, unknown> {
        const result = structuredClone(data);
        let current: Record<string, unknown> = result;
        for (let i = 0; i < segments.length - 1; i++) {
            const seg = segments[i];
            SecurityGuard.assertSafeKey(seg);
            if (!(seg in current) || typeof current[seg] !== 'object' || current[seg] === null) {
                current[seg] = {};
            }
            current = current[seg] as Record<string, unknown>;
        }
        const lastSeg = segments[segments.length - 1];
        SecurityGuard.assertSafeKey(lastSeg);
        current[lastSeg] = value;
        return result;
    }

    static removeBySegments(
        data: Record<string, unknown>,
        segments: string[],
    ): Record<string, unknown> {
        const result = structuredClone(data);
        let current: Record<string, unknown> = result;
        for (let i = 0; i < segments.length - 1; i++) {
            const seg = segments[i];
            if (!(seg in current) || typeof current[seg] !== 'object' || current[seg] === null) {
                return result;
            }
            current = current[seg] as Record<string, unknown>;
        }
        delete current[segments[segments.length - 1]];
        return result;
    }

    /**
     * Renders a template path replacing {key} with bindings values.
     */
    static renderTemplate(template: string, bindings: Record<string, string | number>): string {
        return template.replace(/\{([^}]+)\}/g, (_match, key: string) => {
            if (!(key in bindings)) {
                throw new Error(`Missing binding for key '${key}' in template '${template}'`);
            }
            return String(bindings[key]);
        });
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
