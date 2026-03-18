import { describe, it, expect, beforeEach } from 'vitest';
import { TomlAccessor } from '../../../src/accessors/toml.accessor';
import { PluginRegistry } from '../../../src/core/plugin-registry';
import { InvalidFormatError } from '../../../src/exceptions/invalid-format.error';

describe(TomlAccessor.name, () => {
    const toml = `
title = "My Config"
debug = true

[database]
host = "localhost"
port = 5432
name = "mydb"

[cache]
driver = "redis"
ttl = 60
tags = ["app", "session"]
`;

    it('from — valid TOML string', () => {
        const accessor = TomlAccessor.from(toml);
        expect(accessor).toBeInstanceOf(TomlAccessor);
    });

    it('from — invalid type throws', () => {
        expect(() => TomlAccessor.from(123)).toThrow(InvalidFormatError);
    });

    it('get — top-level key', () => {
        const accessor = TomlAccessor.from(toml);
        expect(accessor.get('title')).toBe('My Config');
        expect(accessor.get('debug')).toBe(true);
    });

    it('get — section + key', () => {
        const accessor = TomlAccessor.from(toml);
        expect(accessor.get('database.host')).toBe('localhost');
        expect(accessor.get('database.port')).toBe(5432);
        expect(accessor.get('database.name')).toBe('mydb');
    });

    it('get — array value', () => {
        const accessor = TomlAccessor.from(toml);
        expect(accessor.get('cache.tags')).toEqual(['app', 'session']);
    });

    it('get — nonexistent returns default', () => {
        const accessor = TomlAccessor.from(toml);
        expect(accessor.get('missing.path', 'fallback')).toBe('fallback');
    });

    it('has — existing', () => {
        const accessor = TomlAccessor.from(toml);
        expect(accessor.has('database.host')).toBe(true);
        expect(accessor.has('title')).toBe(true);
    });

    it('has — nonexistent', () => {
        const accessor = TomlAccessor.from(toml);
        expect(accessor.has('nope')).toBe(false);
    });

    it('set — immutable', () => {
        const accessor = TomlAccessor.from(toml);
        const newAccessor = accessor.set('database.host', '127.0.0.1');
        expect(newAccessor.get('database.host')).toBe('127.0.0.1');
        expect(accessor.get('database.host')).toBe('localhost');
    });

    it('remove — existing', () => {
        const accessor = TomlAccessor.from(toml);
        const newAccessor = accessor.remove('cache');
        expect(newAccessor.has('cache')).toBe(false);
    });

    it('toArray', () => {
        const accessor = TomlAccessor.from(toml);
        const arr = accessor.toArray();
        expect(arr).toHaveProperty('database');
        expect(arr).toHaveProperty('cache');
    });

    it('toJson', () => {
        const accessor = TomlAccessor.from(toml);
        const json = accessor.toJson();
        const parsed = JSON.parse(json);
        expect(parsed.database.host).toBe('localhost');
    });

    it('type', () => {
        const accessor = TomlAccessor.from(toml);
        expect(accessor.type('title')).toBe('string');
        expect(accessor.type('debug')).toBe('bool');
        expect(accessor.type('database')).toBe('object');
        expect(accessor.type('database.port')).toBe('number');
    });

    it('count and keys', () => {
        const accessor = TomlAccessor.from(toml);
        expect(accessor.count()).toBeGreaterThanOrEqual(3); // title, debug, database, cache
        expect(accessor.keys()).toContain('database');
        expect(accessor.keys()).toContain('cache');
    });

    it('handles nested tables', () => {
        const nested = `
[server]
host = "0.0.0.0"

[server.ssl]
enabled = true
port = 443
`;
        const accessor = TomlAccessor.from(nested);
        expect(accessor.get('server.host')).toBe('0.0.0.0');
        expect(accessor.get('server.ssl.enabled')).toBe(true);
        expect(accessor.get('server.ssl.port')).toBe(443);
    });

    it('coerces single-quoted strings', () => {
        const accessor = TomlAccessor.from("key = 'single quoted'");
        expect(accessor.get('key')).toBe('single quoted');
    });

    it('coerces empty inline array', () => {
        const accessor = TomlAccessor.from('tags = []');
        expect(accessor.get('tags')).toEqual([]);
    });

    it('coerces false value', () => {
        const accessor = TomlAccessor.from('enabled = false');
        expect(accessor.get('enabled')).toBe(false);
    });

    it('coerces float values', () => {
        const accessor = TomlAccessor.from('pi = 3.14');
        expect(accessor.get('pi')).toBe(3.14);
    });

    it('rejects invalid TOML with stray lines', () => {
        expect(() => TomlAccessor.from('title = "hello"\njust a stray line\nother = 1')).toThrow();
    });

    it('coerces negative float values', () => {
        const accessor = TomlAccessor.from('temp = -3.14');
        expect(accessor.get('temp')).toBe(-3.14);
    });

    it('coerces negative integer values', () => {
        const accessor = TomlAccessor.from('offset = -42');
        expect(accessor.get('offset')).toBe(-42);
    });

    describe('with registered parser plugin', () => {
        beforeEach(() => {
            PluginRegistry.reset();
        });

        it('uses registered parser plugin instead of smol-toml', () => {
            PluginRegistry.registerParser('toml', {
                parse: (input: string) => ({ custom: true, raw: input.substring(0, 5) }),
            });
            const accessor = TomlAccessor.from('title = "Test"');
            expect(accessor.get('custom')).toBe(true);
            expect(accessor.get('raw')).toBe('title');
        });
    });
});
