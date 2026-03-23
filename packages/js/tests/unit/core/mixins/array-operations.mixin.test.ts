import { describe, it, expect } from 'vitest';
import { ArrayOperationsMixin } from '../../../../src/core/mixins/array-operations.mixin';
import { SafeAccess } from '../../../../src/safe-access';

/**
 * Tests for {@link ArrayOperationsMixin}.
 *
 * The mixin is abstract, so all tests run through concrete accessor classes
 * that extend through the mixin chain (e.g. {@link SafeAccess.fromObject}).
 */
describe(ArrayOperationsMixin.name, () => {
    // ── Compiled & segment-based paths ──────────────────────────────────────────

    describe('getCompiled', () => {
        it('resolves a pre-compiled path', () => {
            const acc = SafeAccess.fromObject({ user: { name: 'Ana' } });
            const compiled = SafeAccess.compilePath('user.name');
            expect(acc.getCompiled(compiled)).toBe('Ana');
        });

        it('returns defaultValue when path is missing', () => {
            const acc = SafeAccess.fromObject({});
            const compiled = SafeAccess.compilePath('missing');
            expect(acc.getCompiled(compiled, 'fallback')).toBe('fallback');
        });
    });

    describe('getAt', () => {
        it('retrieves nested value by segment array', () => {
            const acc = SafeAccess.fromObject({ a: { b: 42 } });
            expect(acc.getAt(['a', 'b'])).toBe(42);
        });

        it('returns defaultValue for missing path', () => {
            const acc = SafeAccess.fromObject({});
            expect(acc.getAt(['x'], 99)).toBe(99);
        });
    });

    describe('hasAt', () => {
        it('returns true for existing path', () => {
            const acc = SafeAccess.fromObject({ a: { b: 0 } });
            expect(acc.hasAt(['a', 'b'])).toBe(true);
        });

        it('returns false for missing path', () => {
            const acc = SafeAccess.fromObject({ a: 1 });
            expect(acc.hasAt(['a', 'missing'])).toBe(false);
        });
    });

    describe('setAt', () => {
        it('sets value by segment array and returns new accessor', () => {
            const acc = SafeAccess.fromObject({ a: { b: 1 } });
            const next = acc.setAt(['a', 'b'], 99);
            expect(next.get('a.b')).toBe(99);
            expect(acc.get('a.b')).toBe(1); // immutable
        });
    });

    describe('removeAt', () => {
        it('removes key by segment array and returns new accessor', () => {
            const acc = SafeAccess.fromObject({ a: { b: 1, c: 2 } });
            const next = acc.removeAt(['a', 'b']);
            expect(next.has('a.b')).toBe(false);
            expect(next.get('a.c')).toBe(2);
        });
    });

    // ── Array mutations ──────────────────────────────────────────────────────────

    describe('push', () => {
        it('appends items to array', () => {
            const acc = SafeAccess.fromObject({ items: [1, 2] });
            expect(acc.push('items', 3).get('items')).toEqual([1, 2, 3]);
        });

        it('is immutable (original unchanged)', () => {
            const acc = SafeAccess.fromObject({ items: [1] });
            acc.push('items', 2);
            expect(acc.get('items')).toEqual([1]);
        });
    });

    describe('pop', () => {
        it('removes last element', () => {
            const acc = SafeAccess.fromObject({ items: [1, 2, 3] });
            expect(acc.pop('items').get('items')).toEqual([1, 2]);
        });
    });

    describe('shift', () => {
        it('removes first element', () => {
            const acc = SafeAccess.fromObject({ items: [1, 2, 3] });
            expect(acc.shift('items').get('items')).toEqual([2, 3]);
        });
    });

    describe('unshift', () => {
        it('prepends items', () => {
            const acc = SafeAccess.fromObject({ items: [3, 4] });
            expect(acc.unshift('items', 1, 2).get('items')).toEqual([1, 2, 3, 4]);
        });
    });

    describe('insert', () => {
        it('inserts at index', () => {
            const acc = SafeAccess.fromObject({ items: [1, 3] });
            expect(acc.insert('items', 1, 2).get('items')).toEqual([1, 2, 3]);
        });
    });

    describe('filterAt', () => {
        it('filters elements by predicate', () => {
            const acc = SafeAccess.fromObject({ nums: [1, 2, 3, 4] });
            expect(acc.filterAt('nums', (n) => (n as number) % 2 === 0).get('nums')).toEqual([
                2, 4,
            ]);
        });
    });

    describe('mapAt', () => {
        it('maps elements through transform', () => {
            const acc = SafeAccess.fromObject({ nums: [1, 2, 3] });
            expect(acc.mapAt('nums', (n) => (n as number) * 2).get('nums')).toEqual([2, 4, 6]);
        });
    });

    describe('sortAt', () => {
        it('sorts in ascending order by default', () => {
            const acc = SafeAccess.fromObject({ nums: [3, 1, 2] });
            expect(acc.sortAt('nums').get('nums')).toEqual([1, 2, 3]);
        });

        it('sorts in descending order', () => {
            const acc = SafeAccess.fromObject({ nums: [3, 1, 2] });
            expect(acc.sortAt('nums', undefined, 'desc').get('nums')).toEqual([3, 2, 1]);
        });
    });

    describe('unique', () => {
        it('removes duplicate primitives', () => {
            const acc = SafeAccess.fromObject({ items: [1, 2, 1, 3, 2] });
            expect(acc.unique('items').get('items')).toEqual([1, 2, 3]);
        });
    });

    describe('flatten', () => {
        it('flattens one level deep by default', () => {
            const acc = SafeAccess.fromObject({ items: [[1, 2], [3]] });
            expect(acc.flatten('items').get('items')).toEqual([1, 2, 3]);
        });
    });

    describe('first', () => {
        it('returns first element', () => {
            const acc = SafeAccess.fromObject({ items: [10, 20, 30] });
            expect(acc.first('items')).toBe(10);
        });

        it('returns defaultValue for empty array', () => {
            const acc = SafeAccess.fromObject({ items: [] });
            expect(acc.first('items', -1)).toBe(-1);
        });
    });

    describe('last', () => {
        it('returns last element', () => {
            const acc = SafeAccess.fromObject({ items: [10, 20, 30] });
            expect(acc.last('items')).toBe(30);
        });
    });

    describe('nth', () => {
        it('returns element at index', () => {
            const acc = SafeAccess.fromObject({ items: [10, 20, 30] });
            expect(acc.nth('items', 1)).toBe(20);
        });

        it('supports negative index', () => {
            const acc = SafeAccess.fromObject({ items: [10, 20, 30] });
            expect(acc.nth('items', -1)).toBe(30);
        });
    });
});
