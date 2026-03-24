import { describe, it, expect, afterEach } from 'vitest';
import { SafeAccess } from '../../src/safe-access';
import { ArrayAccessor } from '../../src/accessors/array.accessor';
import { ObjectAccessor } from '../../src/accessors/object.accessor';
import { JsonAccessor } from '../../src/accessors/json.accessor';
import { XmlAccessor } from '../../src/accessors/xml.accessor';
import { YamlAccessor } from '../../src/accessors/yaml.accessor';
import { TomlAccessor } from '../../src/accessors/toml.accessor';
import { IniAccessor } from '../../src/accessors/ini.accessor';
import { EnvAccessor } from '../../src/accessors/env.accessor';
import { InvalidFormatError } from '../../src/exceptions/invalid-format.error';
import { PathCache } from '../../src/core/resolvers/path-cache';
import { PluginRegistry } from '../../src/core/registries/plugin-registry';
import { optionalRequire } from '../../src/core/utils/optional-require';

describe(SafeAccess.name, () => {
    afterEach(() => {
        SafeAccess.resetAll();
    });

    it('fromArray', () => {
        const accessor = SafeAccess.fromArray([{ name: 'Ana' }]);
        expect(accessor).toBeInstanceOf(ArrayAccessor);
        expect(accessor.get('0.name')).toBe('Ana');
    });

    it('fromObject', () => {
        const accessor = SafeAccess.fromObject({ name: 'Ana' });
        expect(accessor).toBeInstanceOf(ObjectAccessor);
        expect(accessor.get('name')).toBe('Ana');
    });

    it('fromJson', () => {
        const accessor = SafeAccess.fromJson('{"name": "Ana"}');
        expect(accessor).toBeInstanceOf(JsonAccessor);
        expect(accessor.get('name')).toBe('Ana');
    });

    it('fromXml', () => {
        const accessor = SafeAccess.fromXml('<root><name>Ana</name></root>');
        expect(accessor).toBeInstanceOf(XmlAccessor);
        expect(accessor.get('name')).toBe('Ana');
    });

    it('fromYaml', () => {
        const accessor = SafeAccess.fromYaml('name: Ana\nage: 30');
        expect(accessor).toBeInstanceOf(YamlAccessor);
        expect(accessor.get('name')).toBe('Ana');
    });

    it('fromToml', () => {
        const accessor = SafeAccess.fromToml('name = "Ana"\nage = 30');
        expect(accessor).toBeInstanceOf(TomlAccessor);
        expect(accessor.get('name')).toBe('Ana');
    });

    it('fromIni', () => {
        const accessor = SafeAccess.fromIni('[app]\nname = MyApp');
        expect(accessor).toBeInstanceOf(IniAccessor);
        expect(accessor.get('app.name')).toBe('MyApp');
    });

    it('fromEnv', () => {
        const accessor = SafeAccess.fromEnv('APP_NAME=MyApp\nDEBUG=true');
        expect(accessor).toBeInstanceOf(EnvAccessor);
        expect(accessor.get('APP_NAME')).toBe('MyApp');
    });

    it('detect — array', () => {
        const accessor = SafeAccess.detect([1, 2]);
        expect(accessor).toBeInstanceOf(ArrayAccessor);
    });

    it('detect — object', () => {
        const accessor = SafeAccess.detect({ a: 1 });
        expect(accessor).toBeInstanceOf(ObjectAccessor);
    });

    it('detect — JSON string', () => {
        const accessor = SafeAccess.detect('{"a": 1}');
        expect(accessor).toBeInstanceOf(JsonAccessor);
    });

    // ── from() ──────────────────────────────────────────

    describe('from()', () => {
        it('auto-detects array', () => {
            const accessor = SafeAccess.from([{ name: 'Ana' }]);
            expect(accessor).toBeInstanceOf(ArrayAccessor);
            expect(accessor.get('0.name')).toBe('Ana');
        });

        it('auto-detects object', () => {
            const accessor = SafeAccess.from({ name: 'Ana' });
            expect(accessor).toBeInstanceOf(ObjectAccessor);
            expect(accessor.get('name')).toBe('Ana');
        });

        it('auto-detects JSON string', () => {
            const accessor = SafeAccess.from('{"name": "Ana"}');
            expect(accessor).toBeInstanceOf(JsonAccessor);
            expect(accessor.get('name')).toBe('Ana');
        });

        it('with format "array"', () => {
            const accessor = SafeAccess.from([{ name: 'Ana' }], 'array');
            expect(accessor).toBeInstanceOf(ArrayAccessor);
            expect(accessor.get('0.name')).toBe('Ana');
        });

        it('with format "object"', () => {
            const accessor = SafeAccess.from({ name: 'Ana' }, 'object');
            expect(accessor).toBeInstanceOf(ObjectAccessor);
            expect(accessor.get('name')).toBe('Ana');
        });

        it('with format "json"', () => {
            const accessor = SafeAccess.from('{"name": "Ana"}', 'json');
            expect(accessor).toBeInstanceOf(JsonAccessor);
            expect(accessor.get('name')).toBe('Ana');
        });

        it('with format "xml"', () => {
            const accessor = SafeAccess.from('<root><name>Ana</name></root>', 'xml');
            expect(accessor).toBeInstanceOf(XmlAccessor);
            expect(accessor.get('name')).toBe('Ana');
        });

        it('with format "yaml"', () => {
            const accessor = SafeAccess.from('name: Ana\nage: 30', 'yaml');
            expect(accessor).toBeInstanceOf(YamlAccessor);
            expect(accessor.get('name')).toBe('Ana');
        });

        it('with format "toml"', () => {
            const accessor = SafeAccess.from('name = "Ana"\nage = 30', 'toml');
            expect(accessor).toBeInstanceOf(TomlAccessor);
            expect(accessor.get('name')).toBe('Ana');
        });

        it('with format "ini"', () => {
            const accessor = SafeAccess.from('[app]\nname = MyApp', 'ini');
            expect(accessor).toBeInstanceOf(IniAccessor);
            expect(accessor.get('app.name')).toBe('MyApp');
        });

        it('with format "env"', () => {
            const accessor = SafeAccess.from('APP_NAME=MyApp\nDEBUG=true', 'env');
            expect(accessor).toBeInstanceOf(EnvAccessor);
            expect(accessor.get('APP_NAME')).toBe('MyApp');
        });

        it('throws InvalidFormatError for unknown format', () => {
            expect(() => SafeAccess.from('data', 'unknown_xyz')).toThrow(InvalidFormatError);
            expect(() => SafeAccess.from('data', 'unknown_xyz')).toThrow(/Unknown format/);
        });
    });
});

// ── SafeAccess.resetAll — state reset helper ────────────────────
describe('SafeAccess.resetAll() — comprehensive', () => {
    it('resets all global/static state', () => {
        PathCache.set('test.path', [{ type: 'key' as const, value: 'test' }]);
        PluginRegistry.registerSerializer('test-fmt', {
            serialize: () => 'test',
        });

        SafeAccess.resetAll();

        expect(PathCache.has('test.path')).toBe(false);
        expect(PluginRegistry.hasSerializer('test-fmt')).toBe(false);
    });

    it('private constructor is callable via reflection', () => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const instance = new (SafeAccess as any)();
        expect(instance).toBeDefined();
    });
});

// ── optionalRequire — missing module throws ─────────────────────
describe('optionalRequire — missing module', () => {
    it('throws descriptive error when required module is not installed', () => {
        const getter = optionalRequire('nonexistent-module-safe-access-test', 'TestFeature');
        expect(() => getter()).toThrow(
            'nonexistent-module-safe-access-test is required for TestFeature support',
        );
    });
});

// ── SafeAccess.withPolicy — mutation-killing tests ───────────────
describe('SafeAccess — withPolicy', () => {
    afterEach(() => {
        SafeAccess.clearGlobalPolicy();
    });

    it('withPolicy — enforces maxKeys limit', () => {
        const data = { a: 1, b: 2, c: 3, d: 4 };
        expect(() => SafeAccess.withPolicy(JSON.stringify(data), { maxKeys: 3 })).toThrow();
    });

    it('withPolicy — does not throw when maxKeys not set (ConditionalExpression path)', () => {
        const data = { a: 1, b: 2, c: 3, d: 4 };
        expect(() => SafeAccess.withPolicy(JSON.stringify(data), {})).not.toThrow();
    });

    it('withPolicy — enforces maxDepth limit', () => {
        const deep = { a: { b: { c: { d: { e: 'deep' } } } } };
        expect(() => SafeAccess.withPolicy(JSON.stringify(deep), { maxDepth: 2 })).toThrow();
    });

    it('withPolicy — does not throw when maxDepth not set (ConditionalExpression path)', () => {
        const deep = { a: { b: { c: { d: 'value' } } } };
        expect(() => SafeAccess.withPolicy(JSON.stringify(deep), {})).not.toThrow();
    });

    it('withPolicy — enforces maxPayloadBytes for string data', () => {
        const bigStr = 'x'.repeat(1000);
        const payload = JSON.stringify({ data: bigStr });
        expect(() => SafeAccess.withPolicy(payload, { maxPayloadBytes: 10 })).toThrow();
    });

    it('withPolicy — maxPayloadBytes not applied to non-string data (ConditionalExpression)', () => {
        // typeof data !== 'string' → maxPayloadBytes check is skipped
        const data = { key: 'value' };
        expect(() => SafeAccess.withPolicy(data, { maxPayloadBytes: 1 })).not.toThrow();
    });

    it('withPolicy — returns accessor when multiple policies are set', () => {
        const data = { user: 'alice', a: 1, b: 2 };
        const acc = SafeAccess.withPolicy(JSON.stringify(data), { maxKeys: 10 });
        expect(acc.get('user')).toBe('alice');
    });
});
