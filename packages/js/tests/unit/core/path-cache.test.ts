import { describe, it, expect, beforeEach } from 'vitest';
import { PathCache } from '../../../src/core/path-cache';
import { DotNotationParser } from '../../../src/core/dot-notation-parser';

describe('PathCache', () => {
    beforeEach(() => {
        PathCache.clear();
    });

    it('stores and retrieves segments', () => {
        const segments = [{ type: 'key' as const, value: 'a' }];
        PathCache.set('a', segments);
        expect(PathCache.get('a')).toBe(segments);
    });

    it('returns undefined for missing keys', () => {
        expect(PathCache.get('missing')).toBeUndefined();
    });

    it('reports has correctly', () => {
        expect(PathCache.has('a')).toBe(false);
        PathCache.set('a', []);
        expect(PathCache.has('a')).toBe(true);
    });

    it('tracks size', () => {
        expect(PathCache.size).toBe(0);
        PathCache.set('a', []);
        expect(PathCache.size).toBe(1);
        PathCache.set('b', []);
        expect(PathCache.size).toBe(2);
    });

    it('clears all entries', () => {
        PathCache.set('a', []);
        PathCache.set('b', []);
        PathCache.clear();
        expect(PathCache.size).toBe(0);
    });

    it('evicts oldest entry when exceeding max size', () => {
        for (let i = 0; i < 1001; i++) {
            PathCache.set(`path_${i}`, [{ type: 'key' as const, value: String(i) }]);
        }
        expect(PathCache.size).toBe(1000);
        // First entry should have been evicted
        expect(PathCache.has('path_0')).toBe(false);
        // Last entry should exist
        expect(PathCache.has('path_1000')).toBe(true);
    });

    it('is used by DotNotationParser for repeated lookups', () => {
        PathCache.clear();
        const data = { a: { b: 1 } };
        DotNotationParser.get(data, 'a.b');
        // After first lookup, path should be cached
        expect(PathCache.has('a.b')).toBe(true);
        // Second lookup should use cache
        const result = DotNotationParser.get(data, 'a.b');
        expect(result).toBe(1);
    });

    it('disable() prevents caching and get returns undefined', () => {
        PathCache.disable();
        expect(PathCache.isEnabled).toBe(false);
        PathCache.set('x', [{ type: 'key' as const, value: 'x' }]);
        expect(PathCache.get('x')).toBeUndefined();
        expect(PathCache.size).toBe(0);
        PathCache.enable();
    });

    it('enable() re-enables caching after disable', () => {
        PathCache.disable();
        PathCache.enable();
        expect(PathCache.isEnabled).toBe(true);
        PathCache.set('y', [{ type: 'key' as const, value: 'y' }]);
        expect(PathCache.get('y')).toBeDefined();
        PathCache.clear();
    });
});
