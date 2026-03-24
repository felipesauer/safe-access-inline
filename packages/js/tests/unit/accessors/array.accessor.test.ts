import { describe, it, expect } from 'vitest';
import { ArrayAccessor } from '../../../src/accessors/array.accessor';
import { InvalidFormatError } from '../../../src/exceptions/invalid-format.error';

describe(ArrayAccessor.name, () => {
    it('from — valid array', () => {
        const accessor = ArrayAccessor.from([{ name: 'Ana' }]);
        expect(accessor).toBeInstanceOf(ArrayAccessor);
    });

    it('from — valid object', () => {
        const accessor = ArrayAccessor.from({ name: 'Ana' });
        expect(accessor).toBeInstanceOf(ArrayAccessor);
    });

    it('from — invalid input throws', () => {
        expect(() => ArrayAccessor.from('not an array')).toThrow(InvalidFormatError);
    });

    it('get — by index', () => {
        const accessor = ArrayAccessor.from([{ name: 'Ana' }, { name: 'Bob' }]);
        expect(accessor.get('0.name')).toBe('Ana');
        expect(accessor.get('1.name')).toBe('Bob');
    });

    it('get — object key', () => {
        const accessor = ArrayAccessor.from({ user: { name: 'Ana' } });
        expect(accessor.get('user.name')).toBe('Ana');
    });

    it('get — nonexistent returns default', () => {
        const accessor = ArrayAccessor.from({ a: 1 });
        expect(accessor.get('x.y.z', 'default')).toBe('default');
    });

    it('get — wildcard', () => {
        const accessor = ArrayAccessor.from([{ name: 'Ana' }, { name: 'Bob' }]);
        expect(accessor.get('*.name')).toEqual(['Ana', 'Bob']);
    });

    it('has — existing', () => {
        const accessor = ArrayAccessor.from({ name: 'Ana' });
        expect(accessor.has('name')).toBe(true);
    });

    it('has — nonexistent', () => {
        const accessor = ArrayAccessor.from({ a: 1 });
        expect(accessor.has('x.y')).toBe(false);
    });

    it('set — immutable', () => {
        const accessor = ArrayAccessor.from({ name: 'old' });
        const newAccessor = accessor.set('name', 'new');
        expect(newAccessor.get('name')).toBe('new');
        expect(accessor.get('name')).toBe('old');
    });

    it('remove — existing', () => {
        const accessor = ArrayAccessor.from({ a: 1, b: 2 });
        const newAccessor = accessor.remove('b');
        expect(newAccessor.has('b')).toBe(false);
        expect(accessor.has('b')).toBe(true);
    });

    it('type', () => {
        const accessor = ArrayAccessor.from({ name: 'Ana', age: 30, items: [1] });
        expect(accessor.type('name')).toBe('string');
        expect(accessor.type('age')).toBe('number');
        expect(accessor.type('items')).toBe('array');
        expect(accessor.type('missing')).toBeNull();
    });

    it('count', () => {
        const accessor = ArrayAccessor.from({ a: 1, b: 2, c: 3 });
        expect(accessor.count()).toBe(3);
    });

    it('keys', () => {
        const accessor = ArrayAccessor.from({ a: 1, b: 2 });
        expect(accessor.keys()).toEqual(['a', 'b']);
    });

    it('toArray', () => {
        const accessor = ArrayAccessor.from({ a: 1 });
        expect(accessor.toArray()).toEqual({ a: 1 });
    });

    it('toJson', () => {
        const accessor = ArrayAccessor.from({ name: 'Ana' });
        expect(JSON.parse(accessor.toJson())).toEqual({ name: 'Ana' });
    });

    it('all', () => {
        const accessor = ArrayAccessor.from({ x: 1, y: 2 });
        expect(accessor.all()).toEqual({ x: 1, y: 2 });
    });

    it('getMany', () => {
        const accessor = ArrayAccessor.from({ a: 1, b: 2 });
        expect(accessor.getMany({ a: null, b: null, missing: 'default' })).toEqual({
            a: 1,
            b: 2,
            missing: 'default',
        });
    });

    // ── Array parse branch (L24 ConditionalExpression=false / BlockStatement) ──

    it('from — array input is converted to index-keyed plain object (kills L24 mutations)', () => {
        // With mutation (if (Array.isArray(raw)) skipped), the raw array is returned as-is.
        // all() would then return an array, not a plain object.
        const accessor = ArrayAccessor.from([10, 20, 30]);
        const obj = accessor.all();
        expect(Array.isArray(obj)).toBe(false);
        expect(obj).toEqual({ '0': 10, '1': 20, '2': 30 });
    });

    // ── Error message content (L18 StringLiteral="") ──

    it('from — error message is not empty for invalid input', () => {
        // L18: error string is mutated to "".
        expect(() => ArrayAccessor.from('not-an-array-or-object')).toThrow(
            /ArrayAccessor expects an array or object/i,
        );
    });

    // ── from() null guard (L17 ConditionalExpression=false) ──

    it('from — null input throws InvalidFormatError (kills L17 ConditionalExpression=false)', () => {
        // With mutation L17=false: null passes the guard → new ArrayAccessor(null),
        // parse(null) falls through to `return null as Record` → data=null → later crash.
        expect(() => ArrayAccessor.from(null)).toThrow(InvalidFormatError);
    });
});
