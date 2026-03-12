import { describe, it, expect } from 'vitest';
import { ObjectAccessor } from '../../../src/accessors/object.accessor';
import { InvalidFormatError } from '../../../src/exceptions/invalid-format.error';

describe(ObjectAccessor.name, () => {
    it('from — valid object', () => {
        const accessor = ObjectAccessor.from({ name: 'Ana' });
        expect(accessor).toBeInstanceOf(ObjectAccessor);
    });

    it('from — invalid input throws', () => {
        expect(() => ObjectAccessor.from('not an object')).toThrow(InvalidFormatError);
        expect(() => ObjectAccessor.from(null)).toThrow(InvalidFormatError);
    });

    it('get — simple key', () => {
        const accessor = ObjectAccessor.from({ name: 'Ana', age: 30 });
        expect(accessor.get('name')).toBe('Ana');
        expect(accessor.get('age')).toBe(30);
    });

    it('get — nested', () => {
        const accessor = ObjectAccessor.from({ user: { profile: { name: 'Ana' } } });
        expect(accessor.get('user.profile.name')).toBe('Ana');
    });

    it('get — nonexistent returns default', () => {
        const accessor = ObjectAccessor.from({ a: 1 });
        expect(accessor.get('x.y.z', 'default')).toBe('default');
    });

    it('has — existing', () => {
        const accessor = ObjectAccessor.from({ name: 'Ana' });
        expect(accessor.has('name')).toBe(true);
    });

    it('has — nonexistent', () => {
        const accessor = ObjectAccessor.from({ a: 1 });
        expect(accessor.has('x.y')).toBe(false);
    });

    it('set — immutable', () => {
        const accessor = ObjectAccessor.from({ name: 'old' });
        const newAccessor = accessor.set('name', 'new');
        expect(newAccessor.get('name')).toBe('new');
        expect(accessor.get('name')).toBe('old');
    });

    it('remove — existing', () => {
        const accessor = ObjectAccessor.from({ a: 1, b: 2 });
        const newAccessor = accessor.remove('b');
        expect(newAccessor.has('b')).toBe(false);
        expect(accessor.has('b')).toBe(true);
    });

    it('toArray', () => {
        const accessor = ObjectAccessor.from({ name: 'Ana' });
        expect(accessor.toArray()).toEqual({ name: 'Ana' });
    });

    it('toJson', () => {
        const accessor = ObjectAccessor.from({ name: 'Ana' });
        expect(JSON.parse(accessor.toJson())).toEqual({ name: 'Ana' });
    });

    it('toObject', () => {
        const accessor = ObjectAccessor.from({ name: 'Ana' });
        expect(accessor.toObject()).toEqual({ name: 'Ana' });
    });

    it('type', () => {
        const accessor = ObjectAccessor.from({ name: 'Ana', age: 30 });
        expect(accessor.type('name')).toBe('string');
        expect(accessor.type('age')).toBe('number');
        expect(accessor.type('missing')).toBeNull();
    });

    it('count', () => {
        const accessor = ObjectAccessor.from({ a: 1, b: 2 });
        expect(accessor.count()).toBe(2);
    });

    it('keys', () => {
        const accessor = ObjectAccessor.from({ a: 1, b: 2 });
        expect(accessor.keys()).toEqual(['a', 'b']);
    });
});
