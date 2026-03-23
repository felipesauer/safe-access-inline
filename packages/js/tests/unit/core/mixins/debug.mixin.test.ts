import { describe, it, expect } from 'vitest';
import { DebugMixin } from '../../../../src/core/mixins/debug.mixin';
import { SafeAccess } from '../../../../src/safe-access';

/**
 * Tests for {@link DebugMixin}.
 *
 * The mixin is abstract, so all tests run through concrete accessor classes
 * that extend through the mixin chain (e.g. {@link SafeAccess.fromObject}).
 */
describe(DebugMixin.name, () => {
    describe('trace', () => {
        it('returns all-found segments for a fully resolved path', () => {
            const acc = SafeAccess.fromObject({ user: { address: { city: 'SP' } } });
            const result = acc.trace('user.address.city');
            expect(result).toEqual([
                { segment: 'user', found: true, type: 'object' },
                { segment: 'address', found: true, type: 'object' },
                { segment: 'city', found: true, type: 'string' },
            ]);
        });

        it('marks the first missing segment as not-found', () => {
            const acc = SafeAccess.fromObject({ user: {} });
            const result = acc.trace('user.address.city');
            expect(result[0]).toEqual({ segment: 'user', found: true, type: 'object' });
            expect(result[1]).toEqual({ segment: 'address', found: false, type: null });
            expect(result[2]).toEqual({ segment: 'city', found: false, type: null });
        });

        it('stops resolving after the first missing segment', () => {
            const acc = SafeAccess.fromObject({});
            const result = acc.trace('a.b.c');
            expect(result).toHaveLength(3);
            expect(result.every((s) => !s.found)).toBe(true);
        });

        it('never throws for invalid paths', () => {
            const acc = SafeAccess.fromObject({});
            expect(() => acc.trace('deeply.nested.missing.path')).not.toThrow();
        });

        it('returns type: "array" for array values', () => {
            const acc = SafeAccess.fromObject({ items: [1, 2] });
            const result = acc.trace('items');
            expect(result[0].type).toBe('array');
        });

        it('returns type: "number" for numeric values', () => {
            const acc = SafeAccess.fromObject({ age: 42 });
            const result = acc.trace('age');
            expect(result[0].type).toBe('number');
        });

        it('returns type: "boolean" for boolean values', () => {
            const acc = SafeAccess.fromObject({ flag: false });
            const result = acc.trace('flag');
            expect(result[0].type).toBe('boolean');
        });

        it('returns type: "null" for null values', () => {
            const acc = SafeAccess.fromObject({ v: null });
            const result = acc.trace('v');
            expect(result[0]).toEqual({ segment: 'v', found: true, type: 'null' });
        });

        it('handles wildcard segment label', () => {
            const acc = SafeAccess.fromObject({ items: [{ a: 1 }] });
            const result = acc.trace('items[*].a');
            expect(result.some((s) => s.segment === '[*]')).toBe(true);
        });
    });
});
