import { describe, it, expect } from 'vitest';
import { TypeCastingMixin } from '../../../../src/core/mixins/type-casting.mixin';
import { SafeAccess } from '../../../../src/safe-access';

/**
 * Tests for {@link TypeCastingMixin}.
 *
 * The mixin is abstract, so all tests run through concrete accessor classes
 * that extend through the mixin chain (e.g. {@link SafeAccess.fromObject}).
 */
describe(TypeCastingMixin.name, () => {
    // ── getMany ──────────────────────────────────────────────────────────────────

    describe('getMany', () => {
        it('retrieves multiple paths at once', () => {
            const acc = SafeAccess.fromObject({ a: 1, b: 2, c: 3 });
            expect(acc.getMany({ a: null, c: null })).toEqual({ a: 1, c: 3 });
        });

        it('returns defaultValue for missing paths', () => {
            const acc = SafeAccess.fromObject({ a: 1 });
            expect(acc.getMany({ a: 0, missing: 99 })).toEqual({ a: 1, missing: 99 });
        });
    });

    // ── getInt ───────────────────────────────────────────────────────────────────

    describe('getInt', () => {
        it('returns integer value', () => {
            const acc = SafeAccess.fromObject({ n: 42 });
            expect(acc.getInt('n')).toBe(42);
        });

        it('coerces numeric string', () => {
            const acc = SafeAccess.fromObject({ n: '7' });
            expect(acc.getInt('n')).toBe(7);
        });

        it('truncates float to integer', () => {
            const acc = SafeAccess.fromObject({ n: 3.9 });
            expect(acc.getInt('n')).toBe(3);
        });

        it('returns defaultValue for missing path', () => {
            const acc = SafeAccess.fromObject({});
            expect(acc.getInt('missing', 5)).toBe(5);
        });

        it('returns defaultValue for non-numeric string', () => {
            const acc = SafeAccess.fromObject({ n: 'abc' });
            expect(acc.getInt('n', -1)).toBe(-1);
        });
    });

    // ── getBool ──────────────────────────────────────────────────────────────────

    describe('getBool', () => {
        it('returns boolean value as-is', () => {
            const acc = SafeAccess.fromObject({ v: true });
            expect(acc.getBool('v')).toBe(true);
        });

        it('maps "true" string to true', () => {
            const acc = SafeAccess.fromObject({ v: 'true' });
            expect(acc.getBool('v')).toBe(true);
        });

        it('maps "0" string to false', () => {
            const acc = SafeAccess.fromObject({ v: '0' });
            expect(acc.getBool('v')).toBe(false);
        });

        it('maps non-zero number to true', () => {
            const acc = SafeAccess.fromObject({ v: 3 });
            expect(acc.getBool('v')).toBe(true);
        });

        it('returns defaultValue for missing path', () => {
            const acc = SafeAccess.fromObject({});
            expect(acc.getBool('missing', true)).toBe(true);
        });
    });

    // ── getString ────────────────────────────────────────────────────────────────

    describe('getString', () => {
        it('returns string value', () => {
            const acc = SafeAccess.fromObject({ v: 'hello' });
            expect(acc.getString('v')).toBe('hello');
        });

        it('converts number to string', () => {
            const acc = SafeAccess.fromObject({ v: 42 });
            expect(acc.getString('v')).toBe('42');
        });

        it('returns defaultValue for missing path', () => {
            const acc = SafeAccess.fromObject({});
            expect(acc.getString('missing', 'default')).toBe('default');
        });

        it('returns defaultValue for null', () => {
            const acc = SafeAccess.fromObject({ v: null });
            expect(acc.getString('v', 'fallback')).toBe('fallback');
        });
    });

    // ── getArray ─────────────────────────────────────────────────────────────────

    describe('getArray', () => {
        it('returns array value', () => {
            const acc = SafeAccess.fromObject({ items: [1, 2, 3] });
            expect(acc.getArray('items')).toEqual([1, 2, 3]);
        });

        it('returns empty array for non-array value', () => {
            const acc = SafeAccess.fromObject({ v: 42 });
            expect(acc.getArray('v')).toEqual([]);
        });

        it('returns custom defaultValue for missing path', () => {
            const acc = SafeAccess.fromObject({});
            expect(acc.getArray('missing', ['a'])).toEqual(['a']);
        });
    });

    // ── getFloat ─────────────────────────────────────────────────────────────────

    describe('getFloat', () => {
        it('returns float value', () => {
            const acc = SafeAccess.fromObject({ v: 3.14 });
            expect(acc.getFloat('v')).toBeCloseTo(3.14);
        });

        it('coerces numeric string', () => {
            const acc = SafeAccess.fromObject({ v: '1.5' });
            expect(acc.getFloat('v')).toBeCloseTo(1.5);
        });

        it('returns defaultValue for non-numeric string', () => {
            const acc = SafeAccess.fromObject({ v: 'abc' });
            expect(acc.getFloat('v', -1)).toBe(-1);
        });

        it('returns defaultValue for missing path', () => {
            const acc = SafeAccess.fromObject({});
            expect(acc.getFloat('missing', 0.5)).toBeCloseTo(0.5);
        });
    });
});
