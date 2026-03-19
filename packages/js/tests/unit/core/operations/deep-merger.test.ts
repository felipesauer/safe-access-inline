import { describe, it, expect } from 'vitest';
import { deepMerge } from '../../../../src/core/operations/deep-merger';
import { SecurityError } from '../../../../src/exceptions/security.error';

describe('deepMerge', () => {
    it('merges flat objects', () => {
        const result = deepMerge({ a: 1, b: 2 }, { b: 3, c: 4 });
        expect(result).toEqual({ a: 1, b: 3, c: 4 });
    });

    it('merges nested objects recursively', () => {
        const base = { db: { host: 'localhost', port: 5432 } };
        const override = { db: { port: 3306, name: 'mydb' } };
        expect(deepMerge(base, override)).toEqual({
            db: { host: 'localhost', port: 3306, name: 'mydb' },
        });
    });

    it('replaces arrays (last wins)', () => {
        const base = { items: [1, 2, 3] };
        const override = { items: [4, 5] };
        expect(deepMerge(base, override)).toEqual({ items: [4, 5] });
    });

    it('replaces primitives', () => {
        const result = deepMerge({ a: 'old' }, { a: 'new' });
        expect(result.a).toBe('new');
    });

    it('supports multiple overrides', () => {
        const result = deepMerge({ a: 1, b: 2 }, { b: 3, c: 4 }, { c: 5, d: 6 });
        expect(result).toEqual({ a: 1, b: 3, c: 5, d: 6 });
    });

    it('does not mutate input objects', () => {
        const base = { a: { b: 1 } };
        const override = { a: { c: 2 } };
        const baseCopy = structuredClone(base);
        deepMerge(base, override);
        expect(base).toEqual(baseCopy);
    });

    it('handles deep nesting', () => {
        const result = deepMerge({ a: { b: { c: { d: 1 } } } }, { a: { b: { c: { e: 2 } } } });
        expect(result).toEqual({ a: { b: { c: { d: 1, e: 2 } } } });
    });

    it('rejects prototype pollution keys', () => {
        // __proto__ is not enumerable via Object.keys in V8, so test with
        // an object that has the key set explicitly via Object.defineProperty
        const malicious = Object.create(null);
        malicious['__proto__'] = { hacked: true };
        expect(() => deepMerge({}, malicious)).toThrow(SecurityError);

        expect(() =>
            deepMerge({}, { constructor: { hacked: true } } as Record<string, unknown>),
        ).toThrow(SecurityError);
    });

    it('merges with empty overrides', () => {
        expect(deepMerge({ a: 1 })).toEqual({ a: 1 });
    });

    it('handles null values in override', () => {
        const result = deepMerge({ a: { b: 1 } }, { a: null } as unknown as Record<
            string,
            unknown
        >);
        expect(result.a).toBeNull();
    });

    it('throws when merge depth exceeds MAX_MERGE_DEPTH (512)', () => {
        // Both base and override must be deeply nested at matching keys so
        // mergeTwo recurses past the 512 depth limit.
        let base: Record<string, unknown> = { v: 1 };
        let override: Record<string, unknown> = { v: 2 };
        for (let i = 0; i < 513; i++) {
            base = { n: base };
            override = { n: override };
        }
        expect(() => deepMerge(base, override)).toThrow('Deep merge exceeded maximum depth of 512');
    });
});
