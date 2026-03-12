import { describe, it, expect } from 'vitest';
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
});
