import { describe, it, expect } from 'vitest';
import { ArrayAccessor } from '../../../src/accessors/array.accessor';
import { AbstractAccessor } from '../../../src/core/abstract-accessor';

describe(AbstractAccessor.name, () => {
    // ── type() ──

    it('type — returns null for non-existent path', () => {
        const accessor = ArrayAccessor.from({ a: 1 });
        expect(accessor.type('missing')).toBeNull();
    });

    it('type — returns "array" for array values', () => {
        const accessor = ArrayAccessor.from({ items: [1, 2, 3] });
        expect(accessor.type('items')).toBe('array');
    });

    it('type — returns "string" for string values', () => {
        const accessor = ArrayAccessor.from({ name: 'Ana' });
        expect(accessor.type('name')).toBe('string');
    });

    it('type — returns "number" for number values', () => {
        const accessor = ArrayAccessor.from({ age: 30 });
        expect(accessor.type('age')).toBe('number');
    });

    it('type — returns "bool" for boolean values', () => {
        const accessor = ArrayAccessor.from({ debug: true });
        expect(accessor.type('debug')).toBe('bool');
    });

    it('type — returns "object" for object values', () => {
        const accessor = ArrayAccessor.from({ config: { host: 'localhost' } });
        expect(accessor.type('config')).toBe('object');
    });

    it('type — returns "null" for null values', () => {
        const accessor = ArrayAccessor.from({ empty: null });
        expect(accessor.type('empty')).toBe('null');
    });

    // ── count() ──

    it('count — counts root keys when no path given', () => {
        const accessor = ArrayAccessor.from({ a: 1, b: 2, c: 3 });
        expect(accessor.count()).toBe(3);
    });

    it('count — counts array items at path', () => {
        const accessor = ArrayAccessor.from({ items: [1, 2, 3, 4] });
        expect(accessor.count('items')).toBe(4);
    });

    it('count — counts object keys at path', () => {
        const accessor = ArrayAccessor.from({ db: { host: 'h', port: 3306 } });
        expect(accessor.count('db')).toBe(2);
    });

    it('count — returns 0 for non-countable values', () => {
        const accessor = ArrayAccessor.from({ name: 'Ana' });
        expect(accessor.count('name')).toBe(0);
    });

    // ── keys() ──

    it('keys — returns root keys when no path given', () => {
        const accessor = ArrayAccessor.from({ a: 1, b: 2 });
        expect(accessor.keys()).toEqual(['a', 'b']);
    });

    it('keys — returns keys at nested path', () => {
        const accessor = ArrayAccessor.from({ db: { host: 'h', port: 3306 } });
        expect(accessor.keys('db')).toEqual(['host', 'port']);
    });

    it('keys — returns empty array for non-object values', () => {
        const accessor = ArrayAccessor.from({ name: 'Ana' });
        expect(accessor.keys('name')).toEqual([]);
    });

    // ── toJson() ──

    it('toJson — returns compact JSON by default', () => {
        const accessor = ArrayAccessor.from({ a: 1 });
        expect(accessor.toJson()).toBe('{"a":1}');
    });

    it('toJson — returns pretty JSON when pretty=true', () => {
        const accessor = ArrayAccessor.from({ a: 1 });
        expect(accessor.toJson(true)).toBe('{\n  "a": 1\n}');
    });

    // ── all() ──

    it('all — returns shallow copy of data', () => {
        const accessor = ArrayAccessor.from({ x: 1 });
        expect(accessor.all()).toEqual({ x: 1 });
    });

    // ── getMany() ──

    it('getMany — resolves multiple paths', () => {
        const accessor = ArrayAccessor.from({ a: 1, b: 2, c: 3 });
        const result = accessor.getMany({ a: null, b: null, c: null });
        expect(result).toEqual({ a: 1, b: 2, c: 3 });
    });

    it('getMany — returns defaults for non-existent paths', () => {
        const accessor = ArrayAccessor.from({ a: 1 });
        const result = accessor.getMany({ a: null, missing: 'default' });
        expect(result).toEqual({ a: 1, missing: 'default' });
    });

    // ── merge() ──

    it('merge — at root merges deeply and returns new instance', () => {
        const accessor = ArrayAccessor.from({ a: 1, b: { x: 10 } });
        const merged = accessor.merge({ b: { y: 20 }, c: 3 });
        expect(merged.get('a')).toBe(1);
        expect(merged.get('b.x')).toBe(10);
        expect(merged.get('b.y')).toBe(20);
        expect(merged.get('c')).toBe(3);
        // original unchanged
        expect(accessor.has('c')).toBe(false);
    });

    it('merge — at path merges deeply and returns new instance', () => {
        const accessor = ArrayAccessor.from({ config: { db: { host: 'localhost', port: 3306 } } });
        const merged = accessor.merge('config.db', { port: 5432, name: 'mydb' });
        expect(merged.get('config.db.host')).toBe('localhost');
        expect(merged.get('config.db.port')).toBe(5432);
        expect(merged.get('config.db.name')).toBe('mydb');
        // original unchanged
        expect(accessor.get('config.db.port')).toBe(3306);
    });

    it('merge — returns correct accessor type', () => {
        const accessor = ArrayAccessor.from({ a: 1 });
        const merged = accessor.merge({ b: 2 });
        expect(merged).toBeInstanceOf(ArrayAccessor);
    });
});

// ── AbstractAccessor — get() bindings guard edge cases ───────────
describe('AbstractAccessor — get() bindings guard', () => {
    it('get — null second arg does not throw and returns null (kills !== null removal)', () => {
        // typeof null === 'object' in JS; without the !== null guard, null would be passed as
        // bindings to template resolution, which would throw a TypeError when accessing null[key].
        const acc = ArrayAccessor.from({ user: { name: 'Ana' } });
        expect(() => acc.get('{field}.name', null)).not.toThrow();
        expect(acc.get('{field}.name', null)).toBeNull();
    });

    it('get — array second arg is used as default, not bindings (kills !Array.isArray removal)', () => {
        // With the !Array.isArray guard removed, [] would pass the object type-check and be sent
        // to template resolution; template substitution would fail and return null instead of [].
        const acc = ArrayAccessor.from({ user: { name: 'Ana' } });
        expect(acc.get('{field}', [])).toEqual([]);
    });

    it('get — string second arg is used as default, not bindings (kills typeof removal)', () => {
        // typeof 'string' !== 'object', so the guard prevents template resolution.
        const acc = ArrayAccessor.from({ user: { name: 'Ana' } });
        expect(acc.get('{field}', 'fallback')).toBe('fallback');
    });

    it('get — object second arg with no { in path is used as default (kills path.includes removal)', () => {
        // path.includes('{') is false for 'user.name', so the object is used as defaultValue.
        // With the guard removed, template resolution would be called on a path with no placeholders,
        // returning the path unchanged; then get(data, path, undefined??null) returns null.
        const acc = ArrayAccessor.from({});
        expect(acc.get('user.name', { key: 'user' })).toEqual({ key: 'user' });
    });
});

// ── AbstractAccessor — count() edge cases ────────────────────────
describe('AbstractAccessor — count() edge cases', () => {
    it('count — nonexistent path returns 0, not 1 (kills ArrayDeclaration default [] → ["Stryker"])', () => {
        // Default passed to get() when path is missing is [] (length 0).
        // The mutation replaces [] with ["Stryker was here"] (length 1).
        const acc = ArrayAccessor.from({ name: 'Ana' });
        expect(acc.count('nonexistent')).toBe(0);
    });

    it('count — path with null value returns 0 without throwing (kills ConditionalExpression=true)', () => {
        // The guard `typeof target === 'object' && target !== null` prevents Object.keys(null).
        // With the condition forced to true, Object.keys(null) throws a TypeError.
        const acc = ArrayAccessor.from({ val: null } as unknown as Record<string, unknown>);
        expect(() => acc.count('val')).not.toThrow();
        expect(acc.count('val')).toBe(0);
    });
});

// ── AbstractAccessor — keys() edge cases ─────────────────────────
describe('AbstractAccessor — keys() edge cases', () => {
    it('keys — path with string value returns [] not char indices (kills ConditionalExpression=true)', () => {
        // The guard `typeof target === 'object' && target !== null` prevents Object.keys("hello").
        // With the condition forced to true, Object.keys("hello") returns ['0','1','2','3','4'].
        const acc = ArrayAccessor.from({ str: 'hello' });
        expect(acc.keys('str')).toEqual([]);
    });

    it('keys — nonexistent path returns [] (kills ArrayDeclaration default {} → ["Stryker"])', () => {
        // Default in get(path, {}) is {}; mutation replaces with ["Stryker was here"].
        // Object.keys(["Stryker was here"]) = ['0'] → returns ['0'] instead of [].
        const acc = ArrayAccessor.from({ name: 'Ana' });
        expect(acc.keys('nonexistent')).toEqual([]);
    });

    it('keys — path with null value returns [] without throwing', () => {
        // If the null-guard is removed and condition is always true, Object.keys(null) throws.
        const acc = ArrayAccessor.from({ val: null } as unknown as Record<string, unknown>);
        expect(() => acc.keys('val')).not.toThrow();
        expect(acc.keys('val')).toEqual([]);
    });

    // ── getInt() ──

    describe('getInt', () => {
        it('returns numeric value as integer', () => {
            const acc = ArrayAccessor.from({ age: 30 });
            expect(acc.getInt('age')).toBe(30);
        });

        it('truncates float to integer', () => {
            const acc = ArrayAccessor.from({ price: 9.99 });
            expect(acc.getInt('price')).toBe(9);
        });

        it('coerces string "42" to 42', () => {
            const acc = ArrayAccessor.from({ age: '42' });
            expect(acc.getInt('age')).toBe(42);
        });

        it('returns default 0 when path is missing', () => {
            const acc = ArrayAccessor.from({});
            expect(acc.getInt('missing')).toBe(0);
        });

        it('returns custom default when path is missing', () => {
            const acc = ArrayAccessor.from({});
            expect(acc.getInt('missing', -1)).toBe(-1);
        });

        it('returns default for non-numeric string', () => {
            const acc = ArrayAccessor.from({ val: 'hello' });
            expect(acc.getInt('val')).toBe(0);
        });

        it('returns default when value is null', () => {
            const acc = ArrayAccessor.from({ val: null });
            expect(acc.getInt('val', 99)).toBe(99);
        });
    });

    // ── getBool() ──

    describe('getBool', () => {
        it('returns boolean value directly', () => {
            const acc = ArrayAccessor.from({ active: true });
            expect(acc.getBool('active')).toBe(true);
        });

        it('coerces string "true" to true', () => {
            const acc = ArrayAccessor.from({ flag: 'true' });
            expect(acc.getBool('flag')).toBe(true);
        });

        it('coerces string "1" to true', () => {
            const acc = ArrayAccessor.from({ flag: '1' });
            expect(acc.getBool('flag')).toBe(true);
        });

        it('coerces string "yes" to true', () => {
            const acc = ArrayAccessor.from({ flag: 'yes' });
            expect(acc.getBool('flag')).toBe(true);
        });

        it('coerces string "false" to false', () => {
            const acc = ArrayAccessor.from({ flag: 'false' });
            expect(acc.getBool('flag')).toBe(false);
        });

        it('coerces string "0" to false', () => {
            const acc = ArrayAccessor.from({ flag: '0' });
            expect(acc.getBool('flag')).toBe(false);
        });

        it('coerces string "no" to false', () => {
            const acc = ArrayAccessor.from({ flag: 'no' });
            expect(acc.getBool('flag')).toBe(false);
        });

        it('coerces numeric 0 to false', () => {
            const acc = ArrayAccessor.from({ count: 0 });
            expect(acc.getBool('count')).toBe(false);
        });

        it('coerces non-zero number to true', () => {
            const acc = ArrayAccessor.from({ count: 5 });
            expect(acc.getBool('count')).toBe(true);
        });

        it('returns default false when path is missing', () => {
            const acc = ArrayAccessor.from({});
            expect(acc.getBool('missing')).toBe(false);
        });

        it('returns custom default when value is unrecognised string', () => {
            const acc = ArrayAccessor.from({ val: 'maybe' });
            expect(acc.getBool('val', true)).toBe(true);
        });

        it('returns defaultValue when value is neither string, boolean, number, null nor undefined (line 719 false branch)', () => {
            // typeof {} === 'object' — skips the string branch entirely
            const acc = ArrayAccessor.from({ val: {} } as unknown as Record<string, unknown>);
            expect(acc.getBool('val')).toBe(false);
        });
    });

    // ── getString() ──

    describe('getString', () => {
        it('returns string value as-is', () => {
            const acc = ArrayAccessor.from({ name: 'Ana' });
            expect(acc.getString('name')).toBe('Ana');
        });

        it('coerces number to string', () => {
            const acc = ArrayAccessor.from({ age: 30 });
            expect(acc.getString('age')).toBe('30');
        });

        it('coerces boolean to string', () => {
            const acc = ArrayAccessor.from({ active: true });
            expect(acc.getString('active')).toBe('true');
        });

        it('returns default empty string when path missing', () => {
            const acc = ArrayAccessor.from({});
            expect(acc.getString('missing')).toBe('');
        });

        it('returns custom default when value is null', () => {
            const acc = ArrayAccessor.from({ val: null });
            expect(acc.getString('val', 'fallback')).toBe('fallback');
        });
    });

    // ── getArray() ──

    describe('getArray', () => {
        it('returns array value as-is', () => {
            const acc = ArrayAccessor.from({ items: [1, 2, 3] });
            expect(acc.getArray('items')).toEqual([1, 2, 3]);
        });

        it('returns empty array when path is missing', () => {
            const acc = ArrayAccessor.from({});
            expect(acc.getArray('missing')).toEqual([]);
        });

        it('returns default when value is not an array', () => {
            const acc = ArrayAccessor.from({ val: 'hello' });
            expect(acc.getArray('val')).toEqual([]);
        });

        it('returns custom default when value is not an array', () => {
            const acc = ArrayAccessor.from({ val: 42 });
            expect(acc.getArray('val', ['default'])).toEqual(['default']);
        });
    });

    // ── getFloat() ──

    describe('getFloat', () => {
        it('returns float value as-is', () => {
            const acc = ArrayAccessor.from({ price: 9.99 });
            expect(acc.getFloat('price')).toBeCloseTo(9.99);
        });

        it('coerces string "3.14" to float', () => {
            const acc = ArrayAccessor.from({ pi: '3.14' });
            expect(acc.getFloat('pi')).toBeCloseTo(3.14);
        });

        it('coerces integer to float', () => {
            const acc = ArrayAccessor.from({ count: 5 });
            expect(acc.getFloat('count')).toBe(5);
        });

        it('returns default 0 when path is missing', () => {
            const acc = ArrayAccessor.from({});
            expect(acc.getFloat('missing')).toBe(0);
        });

        it('returns default for non-numeric string', () => {
            const acc = ArrayAccessor.from({ val: 'hello' });
            expect(acc.getFloat('val', -1.0)).toBe(-1.0);
        });
    });
});
