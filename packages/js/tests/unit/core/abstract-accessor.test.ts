import { describe, it, expect, beforeEach } from 'vitest';
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
        const masked = accessor.masked();
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
