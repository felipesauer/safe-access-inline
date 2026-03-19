import { SecurityGuard } from '../../security/guards/security-guard';
import { PathCache } from '../resolvers/path-cache';
import { deepMerge } from '../operations/deep-merger';
import { SegmentParser, type Segment } from './segment-parser';
import { PathResolver } from '../resolvers/path-resolver';
import { renderTemplate } from '../rendering/template-renderer';

/**
 * Core engine for resolving paths with dot notation.
 * Functional equivalent of the PHP version.
 *
 * Parsing is delegated to {@link SegmentParser}; recursive traversal
 * is handled by {@link PathResolver}. This class provides the public
 * CRUD API over dot-notation paths.
 */
export class DotNotationParser {
    /**
     * Accesses a value in a nested structure via dot notation.
     */
    static get(data: Record<string, unknown>, path: string, defaultValue: unknown = null): unknown {
        if (path === '') return defaultValue;

        const segments = DotNotationParser.cachedParseSegments(path);
        return PathResolver.resolve(data, segments, 0, defaultValue);
    }

    private static cachedParseSegments(path: string): Segment[] {
        const cached = PathCache.get(path);
        if (cached) return cached as Segment[];
        const segments = SegmentParser.parseSegments(path);
        PathCache.set(path, segments);
        return segments;
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
        const keys = SegmentParser.parseKeys(path);
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
        const merged = deepMerge(
            typeof existing === 'object' && existing !== null && !Array.isArray(existing)
                ? (existing as Record<string, unknown>)
                : {},
            value,
        );
        return path ? DotNotationParser.set(data, path, merged) : structuredClone(merged);
    }

    /**
     * Removes a path (returns a new object — immutable).
     */
    static remove(data: Record<string, unknown>, path: string): Record<string, unknown> {
        const keys = SegmentParser.parseKeys(path);
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
     *
     * @see {@link renderTemplate} for the underlying implementation.
     */
    static renderTemplate(template: string, bindings: Record<string, string | number>): string {
        return renderTemplate(template, bindings);
    }
}
