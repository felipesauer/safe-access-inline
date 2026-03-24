import { describe, it, expect } from 'vitest';
import { SafeAccess } from '../../src/safe-access';

describe('Cross-format conversion', () => {
    it('Object → JSON → Object roundtrip', () => {
        const data = { user: { name: 'Ana', age: 30 } };
        const accessor = SafeAccess.fromObject(data);
        const json = accessor.toJson();

        const accessor2 = SafeAccess.fromJson(json);
        expect(accessor2.all()).toEqual(data);
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
});
