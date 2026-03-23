import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { SafeAccess } from '../../src/safe-access';
import { PluginRegistry } from '../../src/core/registries/plugin-registry';

describe('Cross-format conversion', () => {
    it('Object → JSON → Object roundtrip', () => {
        const data = { user: { name: 'Ana', age: 30 } };
        const accessor = SafeAccess.fromObject(data);
        const json = accessor.toJson();

        const accessor2 = SafeAccess.fromJson(json);
        expect(accessor2.toObject()).toEqual(data);
    });

    it('Array → JSON → Array roundtrip', () => {
        const data = { items: [{ name: 'A' }, { name: 'B' }] };
        const accessor = SafeAccess.fromArray(data as unknown as unknown[]);
        const json = accessor.toJson();

        const accessor2 = SafeAccess.fromJson(json);
        expect(accessor2.toArray()).toEqual(data);
    });

    it('detect returns correct accessor types', () => {
        expect(SafeAccess.detect([1, 2]).constructor.name).toBe('ArrayAccessor');
        expect(SafeAccess.detect({ a: 1 }).constructor.name).toBe('ObjectAccessor');
        expect(SafeAccess.detect('{"a": 1}').constructor.name).toBe('JsonAccessor');
    });

    it('XML → Array → JSON pipeline', () => {
        const xml = `<root><name>Ana</name><age>30</age></root>`;
        const accessor = SafeAccess.fromXml(xml);
        expect(accessor.get('name')).toBe('Ana');
        const json = accessor.toJson();
        const parsed = JSON.parse(json);
        expect(parsed.name).toBe('Ana');
    });

    it('INI → Array → JSON pipeline', () => {
        const ini = `[db]\nhost = localhost\nport = 3306`;
        const accessor = SafeAccess.fromIni(ini);
        expect(accessor.get('db.host')).toBe('localhost');
        const json = accessor.toJson();
        const parsed = JSON.parse(json);
        expect(parsed.db.host).toBe('localhost');
    });

    it('CSV → Array → JSON pipeline', () => {
        const csv = `name,age\nAna,30\nBob,25`;
        const accessor = SafeAccess.fromCsv(csv);
        expect(accessor.get('0.name')).toBe('Ana');
        const json = accessor.toJson();
        expect(() => JSON.parse(json)).not.toThrow();
    });

    it('ENV → Array → JSON pipeline', () => {
        const env = `APP=test\nDEBUG=true`;
        const accessor = SafeAccess.fromEnv(env);
        expect(accessor.get('APP')).toBe('test');
        const json = accessor.toJson();
        const parsed = JSON.parse(json);
        expect(parsed.APP).toBe('test');
    });

    it('YAML → Array → JSON pipeline', () => {
        const yaml = `app:\n  name: MyApp\n  port: 3000`;
        const accessor = SafeAccess.fromYaml(yaml);
        expect(accessor.get('app.name')).toBe('MyApp');
        expect(accessor.get('app.port')).toBe(3000);
        const json = accessor.toJson();
        const parsed = JSON.parse(json);
        expect(parsed.app.name).toBe('MyApp');
    });

    it('TOML → Array → JSON pipeline', () => {
        const toml = `title = "Test"\n\n[server]\nhost = "localhost"\nport = 8080`;
        const accessor = SafeAccess.fromToml(toml);
        expect(accessor.get('title')).toBe('Test');
        expect(accessor.get('server.host')).toBe('localhost');
        const json = accessor.toJson();
        const parsed = JSON.parse(json);
        expect(parsed.server.port).toBe(8080);
    });

    it('YAML → toYaml roundtrip (zero config)', () => {
        const yaml = `app:\n  name: MyApp\n  port: 3000`;
        const accessor = SafeAccess.fromYaml(yaml);
        const output = accessor.toYaml();
        const accessor2 = SafeAccess.fromYaml(output);
        expect(accessor2.get('app.name')).toBe('MyApp');
        expect(accessor2.get('app.port')).toBe(3000);
    });

    it('TOML → toToml roundtrip (zero config)', () => {
        const toml = `title = "Test"\n\n[server]\nhost = "localhost"\nport = 8080`;
        const accessor = SafeAccess.fromToml(toml);
        const output = accessor.toToml();
        const accessor2 = SafeAccess.fromToml(output);
        expect(accessor2.get('title')).toBe('Test');
        expect(accessor2.get('server.host')).toBe('localhost');
        expect(accessor2.get('server.port')).toBe(8080);
    });

    it('JSON → toToml pipeline (zero config)', () => {
        const accessor = SafeAccess.fromJson('{"name": "Ana", "age": 30}');
        const toml = accessor.toToml();
        expect(toml).toContain('name = "Ana"');
        expect(toml).toContain('age = 30');
    });

    it('JSON → toYaml pipeline (zero config)', () => {
        const accessor = SafeAccess.fromJson('{"name": "Ana", "age": 30}');
        const yaml = accessor.toYaml();
        expect(yaml).toContain('name: Ana');
        expect(yaml).toContain('age: 30');
    });

    describe('Serialization via plugins', () => {
        beforeEach(() => {
            PluginRegistry.reset();
        });

        afterEach(() => {
            PluginRegistry.reset();
        });

        it('JSON → YAML pipeline via serializer plugin', () => {
            PluginRegistry.registerSerializer('yaml', {
                serialize: (data) => {
                    const lines: string[] = [];
                    for (const [key, value] of Object.entries(data)) {
                        lines.push(`${key}: ${value}`);
                    }
                    return lines.join('\n') + '\n';
                },
            });

            const accessor = SafeAccess.fromJson('{"name": "Ana", "age": 30}');
            const yaml = accessor.toYaml();
            expect(yaml).toContain('name: Ana');
            expect(yaml).toContain('age: 30');
        });

        it('JSON → XML pipeline via serializer plugin', () => {
            PluginRegistry.registerSerializer('xml', {
                serialize: (data) => {
                    const inner = Object.entries(data)
                        .map(([k, v]) => `<${k}>${v}</${k}>`)
                        .join('');
                    return `<root>${inner}</root>`;
                },
            });

            const accessor = SafeAccess.fromJson('{"name": "Ana"}');
            const xml = accessor.toXml();
            expect(xml).toContain('<name>Ana</name>');
            expect(xml).toContain('<root>');
        });

        it('YAML → toYaml roundtrip via plugin', () => {
            PluginRegistry.registerParser('yaml', {
                parse: (raw) => {
                    const result: Record<string, unknown> = {};
                    for (const line of raw.split('\n')) {
                        const idx = line.indexOf(':');
                        if (idx !== -1) {
                            result[line.substring(0, idx).trim()] = line.substring(idx + 1).trim();
                        }
                    }
                    return result;
                },
            });
            PluginRegistry.registerSerializer('yaml', {
                serialize: (data) =>
                    Object.entries(data)
                        .map(([k, v]) => `${k}: ${v}`)
                        .join('\n') + '\n',
            });

            const accessor = SafeAccess.fromYaml('name: Test\nvalue: 42');
            expect(accessor.get('name')).toBe('Test');

            const yaml = accessor.toYaml();
            expect(yaml).toContain('name: Test');
            expect(yaml).toContain('value: 42');
        });

        it('transform() works for any registered format', () => {
            PluginRegistry.registerSerializer('csv', {
                serialize: (data) =>
                    Object.keys(data).join(',') + '\n' + Object.values(data).join(','),
            });

            const accessor = SafeAccess.fromObject({ a: 1, b: 2 });
            const csv = accessor.transform('csv');
            expect(csv).toBe('a,b\n1,2');
        });
    });
});
