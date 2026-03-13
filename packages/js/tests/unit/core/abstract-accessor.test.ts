import { describe, it, expect, beforeEach } from 'vitest';
import { ArrayAccessor } from '../../../src/accessors/array.accessor';
import { PluginRegistry } from '../../../src/core/plugin-registry';
import { InvalidFormatError } from '../../../src/exceptions/invalid-format.error';
import { UnsupportedTypeError } from '../../../src/exceptions/unsupported-type.error';
import { AbstractAccessor } from '../../../src/core/abstract-accessor';

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

    it('type — returns "boolean" for boolean values', () => {
        const accessor = ArrayAccessor.from({ debug: true });
        expect(accessor.type('debug')).toBe('boolean');
    });

    it('type — returns "object" for object values', () => {
        const accessor = ArrayAccessor.from({ config: { host: 'localhost' } });
        expect(accessor.type('config')).toBe('object');
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

    it('toXml — throws UnsupportedTypeError when no serializer registered', () => {
        const accessor = ArrayAccessor.from({ a: 1 });
        expect(() => accessor.toXml()).toThrow(UnsupportedTypeError);
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
});
