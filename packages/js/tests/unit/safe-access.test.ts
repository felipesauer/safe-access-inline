import { describe, it, expect, vi, afterEach } from 'vitest';
import { SafeAccess } from '../../src/safe-access';
import { ArrayAccessor } from '../../src/accessors/array.accessor';
import { ObjectAccessor } from '../../src/accessors/object.accessor';
import { JsonAccessor } from '../../src/accessors/json.accessor';
import { XmlAccessor } from '../../src/accessors/xml.accessor';
import { YamlAccessor } from '../../src/accessors/yaml.accessor';
import { TomlAccessor } from '../../src/accessors/toml.accessor';
import { IniAccessor } from '../../src/accessors/ini.accessor';
import { CsvAccessor } from '../../src/accessors/csv.accessor';
import { EnvAccessor } from '../../src/accessors/env.accessor';
import { InvalidFormatError } from '../../src/exceptions/invalid-format.error';
import * as ioLoader from '../../src/core/io/io-loader';
import { PathCache } from '../../src/core/resolvers/path-cache';
import { PluginRegistry } from '../../src/core/registries/plugin-registry';
import { optionalRequire } from '../../src/core/io/optional-require';
import * as fs from 'node:fs';
import * as path from 'node:path';
import * as os from 'node:os';

describe(SafeAccess.name, () => {
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

    it('fromCsv', () => {
        const accessor = SafeAccess.fromCsv('name,age\nAna,30');
        expect(accessor).toBeInstanceOf(CsvAccessor);
        expect(accessor.get('0.name')).toBe('Ana');
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

    it('extend and custom', () => {
        SafeAccess.extend(
            'test_format',
            ArrayAccessor as unknown as new (data: unknown) => ArrayAccessor,
        );
        const accessor = SafeAccess.custom('test_format', { a: 1 });
        expect(accessor.get('a')).toBe(1);
    });

    it('custom — unregistered throws', () => {
        expect(() => SafeAccess.custom('nonexistent', {})).toThrow();
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

        it('with format "csv"', () => {
            const accessor = SafeAccess.from('name,age\nAna,30', 'csv');
            expect(accessor).toBeInstanceOf(CsvAccessor);
            expect(accessor.get('0.name')).toBe('Ana');
        });

        it('with format "env"', () => {
            const accessor = SafeAccess.from('APP_NAME=MyApp\nDEBUG=true', 'env');
            expect(accessor).toBeInstanceOf(EnvAccessor);
            expect(accessor.get('APP_NAME')).toBe('MyApp');
        });

        it('with custom format registered via extend()', () => {
            SafeAccess.extend(
                'from_test_format',
                ArrayAccessor as unknown as new (data: unknown) => ArrayAccessor,
            );
            const accessor = SafeAccess.from({ a: 1 }, 'from_test_format');
            expect(accessor.get('a')).toBe(1);
        });

        it('throws InvalidFormatError for unknown format', () => {
            expect(() => SafeAccess.from('data', 'unknown_xyz')).toThrow(InvalidFormatError);
            expect(() => SafeAccess.from('data', 'unknown_xyz')).toThrow(/Unknown format/);
        });
    });

    // ── LOGIC-02 regression: extend() cap & resetAll ──

    it('extend — throws RangeError when cap exceeded', () => {
        SafeAccess.resetAll();
        for (let i = 0; i < 50; i++) {
            SafeAccess.extend(
                `cap_test_${i}`,
                ArrayAccessor as unknown as new (data: unknown) => ArrayAccessor,
            );
        }
        expect(() =>
            SafeAccess.extend(
                'cap_overflow',
                ArrayAccessor as unknown as new (data: unknown) => ArrayAccessor,
            ),
        ).toThrow(RangeError);
        SafeAccess.resetAll();
    });

    it('resetAll — clears custom accessors', () => {
        SafeAccess.extend(
            'reset_test',
            ArrayAccessor as unknown as new (data: unknown) => ArrayAccessor,
        );
        SafeAccess.resetAll();
        expect(() => SafeAccess.custom('reset_test', {})).toThrow();
    });
});

// ── SafeAccess.from() with custom accessor via extend ──────────
describe('SafeAccess — custom accessor through from()', () => {
    afterEach(() => {
        SafeAccess.resetAll();
    });

    it('from() routes to registered custom accessor', () => {
        SafeAccess.extend(
            'my_custom',
            class {
                data: Record<string, unknown>;
                constructor(data: unknown) {
                    this.data = data as Record<string, unknown>;
                }
                get(key: string) {
                    return (this.data as Record<string, unknown>)[key];
                }
            } as unknown as new (
                data: unknown,
            ) => InstanceType<typeof import('../../src/core/abstract-accessor').AbstractAccessor>,
        );
        const accessor = SafeAccess.from({ x: 42 }, 'my_custom');
        expect(accessor.get('x')).toBe(42);
    });
});

// ── SafeAccess.fromFileSync auto-detect ─────────────────────────
describe('SafeAccess — fromFileSync auto-detect', () => {
    it('auto-detects format when file has no recognizable extension', () => {
        const tmpFile = path.join(os.tmpdir(), `sa-test-${Date.now()}.dat`);
        fs.writeFileSync(tmpFile, '{"auto":"detected"}');
        try {
            const acc = SafeAccess.fromFileSync(tmpFile, { allowAnyPath: true });
            expect(acc.get('auto')).toBe('detected');
        } finally {
            fs.unlinkSync(tmpFile);
        }
    });
});

// ── SafeAccess.fromFile auto-detect ─────────────────────────────
describe('SafeAccess — fromFile auto-detect', () => {
    it('auto-detects format when file has no recognizable extension', async () => {
        const tmpFile = path.join(os.tmpdir(), `sa-test-${Date.now()}.dat`);
        fs.writeFileSync(tmpFile, '{"async_auto":"detected"}');
        try {
            const acc = await SafeAccess.fromFile(tmpFile, { allowAnyPath: true });
            expect(acc.get('async_auto')).toBe('detected');
        } finally {
            fs.unlinkSync(tmpFile);
        }
    });
});

// ── SafeAccess.fromUrl ──────────────────────────────────────────
vi.mock('../../src/security/sanitizers/ip-range-checker', async (importOriginal) => {
    const actual =
        await importOriginal<typeof import('../../src/security/sanitizers/ip-range-checker')>();
    return {
        ...actual,
        assertSafeUrl: vi.fn(),
        resolveAndValidateIp: vi.fn().mockResolvedValue('93.184.216.34'),
    };
});

describe('SafeAccess — fromUrl', () => {
    afterEach(() => {
        vi.restoreAllMocks();
    });

    it('fetches URL and parses with explicit format', async () => {
        vi.spyOn(ioLoader, 'fetchUrl').mockResolvedValueOnce('{"url":"data"}');
        const acc = await SafeAccess.fromUrl('https://example.com/data.json', { format: 'json' });
        expect(acc.get('url')).toBe('data');
    });

    it('fetches URL and detects format from URL path', async () => {
        vi.spyOn(ioLoader, 'fetchUrl').mockResolvedValueOnce('{"detected":"yes"}');
        const acc = await SafeAccess.fromUrl('https://example.com/config.json');
        expect(acc.get('detected')).toBe('yes');
    });

    it('fetches URL and auto-detects when no format hint', async () => {
        vi.spyOn(ioLoader, 'fetchUrl').mockResolvedValueOnce('{"auto":"yes"}');
        const acc = await SafeAccess.fromUrl('https://example.com/data');
        expect(acc.get('auto')).toBe('yes');
    });

    it('throws on HTTP error', async () => {
        vi.spyOn(ioLoader, 'fetchUrl').mockRejectedValueOnce(new Error('Failed to fetch URL'));
        await expect(SafeAccess.fromUrl('https://example.com/missing.json')).rejects.toThrow(
            'Failed to fetch URL',
        );
    });
});

// ── SafeAccess.watchFile ────────────────────────────────────────
describe('SafeAccess — watchFile', () => {
    it('calls onChange with accessor when file changes', async () => {
        const tmpFile = path.join(os.tmpdir(), `sa-watch-${Date.now()}.json`);
        fs.writeFileSync(tmpFile, '{"v":1}');

        const onChange = vi.fn();
        const unsub = SafeAccess.watchFile(tmpFile, onChange, { allowAnyPath: true });

        fs.writeFileSync(tmpFile, '{"v":2}');
        await new Promise((r) => setTimeout(r, 300));

        expect(onChange).toHaveBeenCalled();
        const acc = onChange.mock.calls[0][0];
        expect(acc.get('v')).toBe(2);

        unsub();
        fs.unlinkSync(tmpFile);
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
