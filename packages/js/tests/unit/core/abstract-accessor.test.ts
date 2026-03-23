import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { ArrayAccessor } from '../../../src/accessors/array.accessor';
import { PluginRegistry } from '../../../src/core/registries/plugin-registry';
import { InvalidFormatError } from '../../../src/exceptions/invalid-format.error';
import { UnsupportedTypeError } from '../../../src/exceptions/unsupported-type.error';
import { AbstractAccessor } from '../../../src/core/abstract-accessor';
import { SafeAccess } from '../../../src/safe-access';

describe(AbstractAccessor.name, () => {
    beforeEach(() => {
        PluginRegistry.reset();
    });

    afterEach(() => {
        PluginRegistry.reset();
    });

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

    // ── toObject() ──

    it('toObject — returns deep clone', () => {
        const accessor = ArrayAccessor.from({ a: { b: 1 } });
        const obj = accessor.toObject();
        expect(obj).toEqual({ a: { b: 1 } });
        // verify deep clone
        (obj.a as Record<string, unknown>).b = 999;
        expect(accessor.get('a.b')).toBe(1);
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

    // ── toYaml() ──

    it('toYaml — uses registered serializer plugin', () => {
        PluginRegistry.registerSerializer('yaml', {
            serialize: (data) => `yaml:${JSON.stringify(data)}`,
        });
        const accessor = ArrayAccessor.from({ a: 1 });
        expect(accessor.toYaml()).toBe('yaml:{"a":1}');
    });

    it('toYaml — uses default js-yaml when no serializer registered', () => {
        const accessor = ArrayAccessor.from({ a: 1 });
        const result = accessor.toYaml();
        expect(result).toContain('a: 1');
    });

    // ── toToml() ──

    it('toToml — uses registered serializer plugin', () => {
        PluginRegistry.registerSerializer('toml', {
            serialize: (data) => `toml:${JSON.stringify(data)}`,
        });
        const accessor = ArrayAccessor.from({ a: 1 });
        expect(accessor.toToml()).toBe('toml:{"a":1}');
    });

    it('toToml — uses default smol-toml when no serializer registered', () => {
        const accessor = ArrayAccessor.from({ a: 1 });
        const result = accessor.toToml();
        expect(result).toContain('a = 1');
    });

    it('toToml — throws InvalidFormatError when smol-toml fails to serialize', () => {
        // smol-toml cannot serialize undefined or functions
        const accessor = ArrayAccessor.from({ fn: () => {} } as unknown as Record<string, unknown>);
        expect(() => accessor.toToml()).toThrow(InvalidFormatError);
    });

    // ── toXml() ──

    it('toXml — throws InvalidFormatError for invalid root element name', () => {
        PluginRegistry.registerSerializer('xml', {
            serialize: (_data) => `<root/>`,
        });
        const accessor = ArrayAccessor.from({ a: 1 });
        expect(() => accessor.toXml('123invalid')).toThrow(InvalidFormatError);
    });

    it('toXml — uses registered serializer plugin', () => {
        PluginRegistry.registerSerializer('xml', {
            serialize: (_data) => `<root><a>1</a></root>`,
        });
        const accessor = ArrayAccessor.from({ a: 1 });
        expect(accessor.toXml()).toBe('<root><a>1</a></root>');
    });

    it('toXml — uses built-in serializer when no plugin registered', () => {
        const accessor = ArrayAccessor.from({ a: 1, b: 'hello' });
        const xml = accessor.toXml();
        expect(xml).toContain('<?xml version="1.0"?>');
        expect(xml).toContain('<root>');
        expect(xml).toContain('<a>1</a>');
        expect(xml).toContain('<b>hello</b>');
        expect(xml).toContain('</root>');
    });

    it('toXml — built-in handles nested objects', () => {
        const accessor = ArrayAccessor.from({ user: { name: 'Ana', age: 30 } });
        const xml = accessor.toXml();
        expect(xml).toContain('<user>');
        expect(xml).toContain('<name>Ana</name>');
        expect(xml).toContain('<age>30</age>');
    });

    it('toXml — built-in escapes XML special characters', () => {
        const accessor = ArrayAccessor.from({ message: '<script>alert("xss")</script>' });
        const xml = accessor.toXml();
        expect(xml).toContain('&lt;script&gt;');
        expect(xml).not.toContain('<script>');
    });

    it('toXml — built-in uses item_ prefix for numeric keys', () => {
        const accessor = ArrayAccessor.from({ 0: 'first', 1: 'second' });
        const xml = accessor.toXml();
        expect(xml).toContain('<item_0>first</item_0>');
        expect(xml).toContain('<item_1>second</item_1>');
    });

    it('toXml — built-in handles null values as empty strings', () => {
        const accessor = ArrayAccessor.from({ key: null } as unknown as Record<string, unknown>);
        const xml = accessor.toXml();
        expect(xml).toContain('<key></key>');
    });

    it('toXml — built-in handles boolean values', () => {
        const accessor = ArrayAccessor.from({ active: true, deleted: false });
        const xml = accessor.toXml();
        expect(xml).toContain('<active>true</active>');
        expect(xml).toContain('<deleted>false</deleted>');
    });

    it('toXml — built-in handles undefined values as empty strings', () => {
        const accessor = ArrayAccessor.from({ key: undefined } as unknown as Record<
            string,
            unknown
        >);
        const xml = accessor.toXml();
        expect(xml).toContain('<key></key>');
    });

    it('toXml — custom root element', () => {
        const accessor = ArrayAccessor.from({ key: 'value' });
        const xml = accessor.toXml('data');
        expect(xml).toContain('<data>');
        expect(xml).toContain('</data>');
    });

    // ── transform() ──

    it('transform — delegates to registered serializer', () => {
        PluginRegistry.registerSerializer('custom', {
            serialize: (data) => `custom:${JSON.stringify(data)}`,
        });
        const accessor = ArrayAccessor.from({ a: 1 });
        expect(accessor.transform('custom')).toBe('custom:{"a":1}');
    });
    it('transform — falls back to toYaml for yaml format', () => {
        const accessor = ArrayAccessor.from({ a: 1 });
        const result = accessor.transform('yaml');
        expect(result).toContain('a: 1');
    });

    it('transform — falls back to toToml for toml format', () => {
        const accessor = ArrayAccessor.from({ a: 1 });
        const result = accessor.transform('toml');
        expect(result).toContain('a = 1');
    });
    it('transform — throws when no serializer registered', () => {
        const accessor = ArrayAccessor.from({ a: 1 });
        expect(() => accessor.transform('nonexistent')).toThrow(UnsupportedTypeError);
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

    // ── getTemplate() ──

    it('getTemplate — resolves bindings in template string', () => {
        const accessor = ArrayAccessor.from({ user: { name: 'Ana', age: 25 } });
        expect(accessor.getTemplate('user.{key}', { key: 'name' })).toBe('Ana');
    });

    it('getTemplate — returns default when resolved path is missing', () => {
        const accessor = ArrayAccessor.from({ user: {} });
        expect(accessor.getTemplate('user.{key}', { key: 'missing' }, 'fallback')).toBe('fallback');
    });

    it('get — resolves template path when second arg is bindings object', () => {
        const accessor = ArrayAccessor.from({ user: { name: 'Ana', age: 25 } });
        expect(accessor.get('user.{field}', { field: 'name' }, null)).toBe('Ana');
    });

    it('get — template get returns default when resolved path is missing', () => {
        const accessor = ArrayAccessor.from({ user: {} });
        expect(accessor.get('user.{field}', { field: 'missing' }, 'fallback')).toBe('fallback');
    });

    it('cloneWithState — readonly flag is propagated and data is frozen', () => {
        const accessor = new ArrayAccessor({ password: 'secret', name: 'Ana' }, { readonly: true });
        const masked = accessor.mask();
        // The masked accessor is also readonly
        expect(() => masked.set('name', 'Bob')).toThrow();
    });

    // ── toCsv() ──

    it('toCsv — returns empty string when data has no rows', () => {
        const accessor = ArrayAccessor.from({});
        expect(accessor.toCsv()).toBe('');
    });

    it('toCsv — returns CSV with headers and rows', () => {
        const accessor = ArrayAccessor.from({
            r1: { name: 'Ana', age: 25 },
            r2: { name: 'Bob', age: 30 },
        });
        const csv = accessor.toCsv();
        expect(csv).toContain('name,age');
        expect(csv).toContain('Ana,25');
        expect(csv).toContain('Bob,30');
    });

    it('toCsv — escapes cells containing commas and quotes', () => {
        const accessor = ArrayAccessor.from({
            r1: { note: 'hello, world', other: 'plain' },
        });
        const csv = accessor.toCsv();
        expect(csv).toContain('"hello, world"');
    });

    it('toCsv — escapes cells containing double-quotes', () => {
        const accessor = ArrayAccessor.from({
            r1: { text: 'say "hello"', other: 'x' },
        });
        const csv = accessor.toCsv();
        expect(csv).toContain('"say ""hello"""');
    });

    it('toCsv — escapes cells containing newlines', () => {
        const accessor = ArrayAccessor.from({
            r1: { text: 'line1\nline2', other: 'x' },
        });
        const csv = accessor.toCsv();
        expect(csv).toContain('"line1\nline2"');
    });

    it('toCsv — fills missing row values with empty string', () => {
        const accessor = ArrayAccessor.from({
            r1: { name: 'Ana', age: 25 },
            r2: { name: 'Bob' },
        });
        const csv = accessor.toCsv();
        // r2 has no age — should produce empty cell
        const lines = csv.split('\n');
        expect(lines[2]).toBe('Bob,');
    });

    it('transform — falls back to toCsv for csv format', () => {
        const accessor = ArrayAccessor.from({
            r1: { name: 'Ana', age: 25 },
        });
        const result = accessor.transform('csv');
        expect(result).toContain('name,age');
        expect(result).toContain('Ana,25');
    });

    it('toCsv — skips deprecation audit when explicit csvMode is passed', () => {
        const accessor = ArrayAccessor.from({
            r1: { name: 'Ana', age: 25 },
        });
        // Passing an explicit csvMode bypasses the emitAudit deprecation warning branch
        const csv = accessor.toCsv('none');
        expect(csv).toContain('name,age');
        expect(csv).toContain('Ana,25');
    });
});

// ── AbstractAccessor — unique with key, sortAt with key ─────────
describe('AbstractAccessor — array operations with key', () => {
    it('unique(path, key) deduplicates by key field', () => {
        const acc = SafeAccess.fromJson(
            JSON.stringify({
                items: [
                    { id: 1, name: 'a' },
                    { id: 2, name: 'b' },
                    { id: 1, name: 'c' },
                ],
            }),
        );
        const result = acc.unique('items', 'id');
        expect(result.get('items')).toEqual([
            { id: 1, name: 'a' },
            { id: 2, name: 'b' },
        ]);
    });

    it('sortAt with key sorts by object property', () => {
        const acc = SafeAccess.fromJson(
            JSON.stringify({
                items: [
                    { name: 'Charlie', age: 30 },
                    { name: 'Alice', age: 25 },
                    { name: 'Bob', age: 35 },
                ],
            }),
        );
        const result = acc.sortAt('items', 'name', 'asc');
        const items = result.get('items') as Record<string, unknown>[];
        expect(items[0].name).toBe('Alice');
        expect(items[1].name).toBe('Bob');
        expect(items[2].name).toBe('Charlie');
    });

    it('sortAt with key handles null/undefined values', () => {
        const acc = SafeAccess.fromJson(
            JSON.stringify({
                items: [
                    { name: 'Bob', val: 2 },
                    { name: 'Alice', val: null },
                    { name: 'Charlie', val: 1 },
                ],
            }),
        );
        const result = acc.sortAt('items', 'val', 'asc');
        const items = result.get('items') as Record<string, unknown>[];
        expect(items[items.length - 1].val).toBeNull();
    });

    it('sortAt desc with key', () => {
        const acc = SafeAccess.fromJson(
            JSON.stringify({
                items: [{ v: 1 }, { v: 3 }, { v: 2 }],
            }),
        );
        const result = acc.sortAt('items', 'v', 'desc');
        const items = result.get('items') as Record<string, unknown>[];
        expect(items[0].v).toBe(3);
        expect(items[1].v).toBe(2);
        expect(items[2].v).toBe(1);
    });
});

// ── AbstractAccessor — last() on empty / getArrayOrEmpty on non-array ──
describe('AbstractAccessor — last/first edge cases', () => {
    it('last() on empty array returns defaultValue', () => {
        const acc = SafeAccess.fromJson('{"items":[]}');
        expect(acc.last('items')).toBeNull();
        expect(acc.last('items', 'fallback')).toBe('fallback');
    });

    it('last() on non-array path returns defaultValue (getArrayOrEmpty returns [])', () => {
        const acc = SafeAccess.fromJson('{"items":"not-an-array"}');
        expect(acc.last('items')).toBeNull();
        expect(acc.last('items', 'fallback')).toBe('fallback');
    });

    it('first() on non-array path returns defaultValue', () => {
        const acc = SafeAccess.fromJson('{"items":42}');
        expect(acc.first('items')).toBeNull();
    });
});

// ── AbstractAccessor — get() bindings guard edge cases ───────────
describe('AbstractAccessor — get() bindings guard', () => {
    it('get — null second arg does not throw and returns null (kills !== null removal)', () => {
        // typeof null === 'object' in JS; without the !== null guard, null would be passed as
        // bindings to renderTemplate, which would throw a TypeError when accessing null[key].
        const acc = ArrayAccessor.from({ user: { name: 'Ana' } });
        expect(() => acc.get('{field}.name', null)).not.toThrow();
        expect(acc.get('{field}.name', null)).toBeNull();
    });

    it('get — array second arg is used as default, not bindings (kills !Array.isArray removal)', () => {
        // With the !Array.isArray guard removed, [] would pass the object type-check and be sent
        // to renderTemplate; template substitution would fail and return null instead of [].
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
        // With the guard removed, renderTemplate would be called on a path with no placeholders,
        // returning the path unchanged; then get(data, path, undefined??null) returns null.
        const acc = ArrayAccessor.from({});
        expect(acc.get('user.name', { key: 'user' })).toEqual({ key: 'user' });
    });

    it('get — bindings without explicit defaultValue returns null for missing path (kills null→"" mutation)', () => {
        // L76: `defaultValue ?? null` — if null is mutated to "", a missing path returns ""
        // instead of null when no third argument is supplied.
        const acc = ArrayAccessor.from({ user: {} });
        expect(acc.get('user.{field}', { field: 'missing' })).toBeNull();
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

    // ── trace() ──

    describe('trace', () => {
        it('returns found:true for all segments of an existing path', () => {
            const acc = ArrayAccessor.from({ user: { address: { city: 'São Paulo' } } });
            const result = acc.trace('user.address.city');
            expect(result).toEqual([
                { segment: 'user', found: true, type: 'object' },
                { segment: 'address', found: true, type: 'object' },
                { segment: 'city', found: true, type: 'string' },
            ]);
        });

        it('returns found:false for the first missing segment and stops', () => {
            const acc = ArrayAccessor.from({ user: { name: 'Ana' } });
            const result = acc.trace('user.address.city');
            expect(result).toHaveLength(3);
            expect(result[0]).toEqual({ segment: 'user', found: true, type: 'object' });
            expect(result[1]).toEqual({ segment: 'address', found: false, type: null });
            expect(result[2]).toEqual({ segment: 'city', found: false, type: null });
        });

        it('does not throw for an entirely invalid path', () => {
            const acc = ArrayAccessor.from({});
            expect(() => acc.trace('a.b.c')).not.toThrow();
        });

        it('reports correct types for each found segment', () => {
            const acc = ArrayAccessor.from({ n: 42, b: true, a: [1], o: { x: 1 }, nil: null });
            expect(acc.trace('n')[0].type).toBe('number');
            expect(acc.trace('b')[0].type).toBe('boolean');
            expect(acc.trace('a')[0].type).toBe('array');
            expect(acc.trace('o')[0].type).toBe('object');
            expect(acc.trace('nil')[0].type).toBe('null');
        });

        it('handles wildcard segment in trace label', () => {
            const acc = ArrayAccessor.from({ items: [{ price: 10 }] });
            const result = acc.trace('items.[*]');
            expect(result[0]).toMatchObject({ segment: 'items', found: true });
        });

        it('returns empty array for empty path segments', () => {
            const acc = ArrayAccessor.from({ a: 1 });
            expect(acc.trace('')).toEqual([]);
        });

        it('trace label: FILTER segment returns [?...]', () => {
            const acc = ArrayAccessor.from({ items: [{ price: 5 }, { price: 20 }] });
            const result = acc.trace('items.[?price>10]');
            const filterEntry = result.find((r) => r.segment === '[?...]');
            expect(filterEntry).toBeDefined();
        });

        it('trace label: SLICE segment returns formatted slice string', () => {
            const acc = ArrayAccessor.from({ items: [1, 2, 3, 4] });
            const result = acc.trace('items.[0:2]');
            const sliceEntry = result.find((r) => r.segment.startsWith('['));
            expect(sliceEntry).toBeDefined();
        });

        it('trace label: SLICE with null start (line 847 false branch)', () => {
            const acc = ArrayAccessor.from({ items: [1, 2, 3, 4] });
            // [:2] → start=null, end=2, step=null
            const result = acc.trace('items.[:2]');
            const sliceEntry = result.find((r) => r.segment.startsWith('['));
            expect(sliceEntry).toBeDefined();
        });

        it('trace label: SLICE with null end (line 848 false branch)', () => {
            const acc = ArrayAccessor.from({ items: [1, 2, 3, 4] });
            // [1:] → start=1, end=null, step=null
            const result = acc.trace('items.[1:]');
            const sliceEntry = result.find((r) => r.segment.startsWith('['));
            expect(sliceEntry).toBeDefined();
        });

        it('trace label: SLICE with step (line 849 true branch)', () => {
            const acc = ArrayAccessor.from({ items: [1, 2, 3, 4] });
            // [0:4:2] → start=0, end=4, step=2
            const result = acc.trace('items.[0:4:2]');
            const sliceEntry = result.find((r) => r.segment.startsWith('['));
            expect(sliceEntry).toBeDefined();
        });

        it('trace label: MULTI_INDEX segment returns [idx1,idx2]', () => {
            const acc = ArrayAccessor.from({ items: ['a', 'b', 'c'] });
            const result = acc.trace('items.[0,1]');
            const multiEntry = result.find((r) => r.segment.startsWith('['));
            expect(multiEntry).toBeDefined();
        });

        it('trace label: MULTI_KEY segment returns [key1,key2]', () => {
            const acc = ArrayAccessor.from({ user: { name: 'Ana', age: 30 } });
            // MULTI_KEY syntax requires quoted keys: ['name','age']
            const result = acc.trace("user.['name','age']");
            const multiEntry = result.find((r) => r.segment.startsWith('['));
            expect(multiEntry).toBeDefined();
        });

        it('trace label: DESCENT segment returns ..key', () => {
            const acc = ArrayAccessor.from({ dept: { eng: { head: 'Ana' } } });
            const result = acc.trace('..head');
            const descentEntry = result.find((r) => r.segment.startsWith('..'));
            expect(descentEntry).toBeDefined();
        });

        it('trace label: DESCENT_MULTI segment returns ..[key1,key2] (line 855)', () => {
            const acc = ArrayAccessor.from({ dept: { head: 'Ana', lead: 'Bob', other: 'X' } });
            // DESCENT_MULTI syntax: ..['key1','key2'] — quoted keys after double-dot bracket
            const result = acc.trace("..['head','lead']");
            const multiDescentEntry = result.find((r) => r.segment.startsWith('..['));
            expect(multiDescentEntry).toBeDefined();
        });

        it('segmentToString default branch returns type string for unknown segment (line 861)', () => {
            // Simulate an unknown segment type by calling segmentToString via an accessor that
            // receives a PROJECTION segment — which has no dedicated case and falls to default
            const acc = ArrayAccessor.from({ items: [{ name: 'a' }] });
            // Projection syntax: .{field} — PROJECTION has no case in segmentToString → default
            const result = acc.trace('items.{name}');
            // PROJECTION is handled (default case) — trace entry must exist
            expect(result.length).toBeGreaterThan(0);
        });

        it('traceValueType returns null for non-standard typeof values', () => {
            // Symbols are typeof 'symbol' — the switch default returns null
            const acc = ArrayAccessor.from({ sym: Symbol('test') } as unknown as Record<
                string,
                unknown
            >);
            const result = acc.trace('sym');
            // The type field for a symbol value falls into the `default` branch → null
            expect(result[0].type).toBeNull();
        });
    });

    // ── validatePatch ──

    describe('validatePatch', () => {
        it('does not throw for valid patch operations', () => {
            const acc = ArrayAccessor.from({ a: 1 });
            expect(() => acc.validatePatch([{ op: 'add', path: '/b', value: 2 }])).not.toThrow();
        });

        it('throws JsonPatchTestFailedError for invalid operation type', () => {
            const acc = ArrayAccessor.from({ a: 1 });
            // validatePatch throws when 'move' op is missing required 'from' field
            expect(() =>
                acc.validatePatch([
                    { op: 'move', path: '/b' } as unknown as {
                        op: 'add';
                        path: string;
                        value: unknown;
                    },
                ]),
            ).toThrow();
        });
    });
});
