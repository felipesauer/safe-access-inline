import { describe, it, expect, beforeEach } from 'vitest';
import { YamlAccessor } from '../../../src/accessors/yaml.accessor';
import { PluginRegistry } from '../../../src/core/plugin-registry';
import { InvalidFormatError } from '../../../src/exceptions/invalid-format.error';

describe(YamlAccessor.name, () => {
    const yaml = `
app:
  name: MyApp
  version: 2.1
  debug: true

database:
  host: localhost
  port: 5432
  credentials:
    user: admin
    pass: secret

features:
  - auth
  - api
  - dashboard
`;

    it('from — valid YAML string', () => {
        const accessor = YamlAccessor.from(yaml);
        expect(accessor).toBeInstanceOf(YamlAccessor);
    });

    it('from — invalid type throws', () => {
        expect(() => YamlAccessor.from(123)).toThrow(InvalidFormatError);
    });

    it('get — nested key', () => {
        const accessor = YamlAccessor.from(yaml);
        expect(accessor.get('app.name')).toBe('MyApp');
        expect(accessor.get('app.version')).toBe(2.1);
        expect(accessor.get('app.debug')).toBe(true);
    });

    it('get — deeply nested', () => {
        const accessor = YamlAccessor.from(yaml);
        expect(accessor.get('database.credentials.user')).toBe('admin');
        expect(accessor.get('database.credentials.pass')).toBe('secret');
    });

    it('get — numeric values', () => {
        const accessor = YamlAccessor.from(yaml);
        expect(accessor.get('database.port')).toBe(5432);
    });

    it('get — array values', () => {
        const accessor = YamlAccessor.from(yaml);
        const features = accessor.get('features');
        expect(features).toEqual(['auth', 'api', 'dashboard']);
    });

    it('get — nonexistent returns default', () => {
        const accessor = YamlAccessor.from(yaml);
        expect(accessor.get('missing.path', 'fallback')).toBe('fallback');
    });

    it('has — existing', () => {
        const accessor = YamlAccessor.from(yaml);
        expect(accessor.has('app.name')).toBe(true);
        expect(accessor.has('database.host')).toBe(true);
    });

    it('has — nonexistent', () => {
        const accessor = YamlAccessor.from(yaml);
        expect(accessor.has('nope')).toBe(false);
    });

    it('set — immutable', () => {
        const accessor = YamlAccessor.from(yaml);
        const newAccessor = accessor.set('app.name', 'NewApp');
        expect(newAccessor.get('app.name')).toBe('NewApp');
        expect(accessor.get('app.name')).toBe('MyApp');
    });

    it('remove — existing', () => {
        const accessor = YamlAccessor.from(yaml);
        const newAccessor = accessor.remove('app.debug');
        expect(newAccessor.has('app.debug')).toBe(false);
        expect(accessor.has('app.debug')).toBe(true);
    });

    it('toArray', () => {
        const accessor = YamlAccessor.from(yaml);
        const arr = accessor.toArray();
        expect(arr).toHaveProperty('app');
        expect(arr).toHaveProperty('database');
    });

    it('toJson', () => {
        const accessor = YamlAccessor.from(yaml);
        const json = accessor.toJson();
        const parsed = JSON.parse(json);
        expect(parsed.app.name).toBe('MyApp');
    });

    it('type', () => {
        const accessor = YamlAccessor.from(yaml);
        expect(accessor.type('app')).toBe('object');
        expect(accessor.type('app.name')).toBe('string');
        expect(accessor.type('app.debug')).toBe('boolean');
        expect(accessor.type('database.port')).toBe('number');
    });

    it('count and keys', () => {
        const accessor = YamlAccessor.from(yaml);
        expect(accessor.count()).toBeGreaterThanOrEqual(3); // app, database, features
        expect(accessor.keys()).toContain('app');
        expect(accessor.keys()).toContain('database');
        expect(accessor.keys()).toContain('features');
    });

    it('handles null values', () => {
        const yamlNull = `key1: null\nkey2: ~\nkey3: value`;
        const accessor = YamlAccessor.from(yamlNull);
        expect(accessor.get('key1')).toBeNull();
        expect(accessor.get('key2')).toBeNull();
        expect(accessor.get('key3')).toBe('value');
    });

    it('handles quoted strings', () => {
        const yamlQuoted = `name: "hello world"\npath: '/usr/local'`;
        const accessor = YamlAccessor.from(yamlQuoted);
        expect(accessor.get('name')).toBe('hello world');
        expect(accessor.get('path')).toBe('/usr/local');
    });

    it('handles array of objects with inline key-value', () => {
        const yamlData = `users:\n  - name: Ana\n    age: 30\n  - name: Bob\n    age: 25`;
        const accessor = YamlAccessor.from(yamlData);
        expect(accessor.get('users.0.name')).toBe('Ana');
        expect(accessor.get('users.0.age')).toBe(30);
        expect(accessor.get('users.1.name')).toBe('Bob');
    });

    it('handles array of objects with nested children', () => {
        const yamlData = `items:\n  - config:\n      host: localhost\n      port: 3306`;
        const accessor = YamlAccessor.from(yamlData);
        expect(accessor.get('items.0.config.host')).toBe('localhost');
        expect(accessor.get('items.0.config.port')).toBe(3306);
    });

    it('handles array items with empty nested value', () => {
        const yamlData = `items:\n  - key:`;
        const accessor = YamlAccessor.from(yamlData);
        expect(accessor.get('items.0.key')).toBeNull();
    });

    it('handles simple scalar array items', () => {
        const yamlData = `tags:\n  - alpha\n  - beta\n  - gamma`;
        const accessor = YamlAccessor.from(yamlData);
        expect(accessor.get('tags')).toEqual(['alpha', 'beta', 'gamma']);
    });

    it('handles empty value key as null', () => {
        const yamlData = `empty:\nfilled: value`;
        const accessor = YamlAccessor.from(yamlData);
        expect(accessor.get('empty')).toBeNull();
        expect(accessor.get('filled')).toBe('value');
    });

    it('handles comments between lines', () => {
        const yamlData = `# header\nkey1: value1\n# middle comment\nkey2: value2`;
        const accessor = YamlAccessor.from(yamlData);
        expect(accessor.get('key1')).toBe('value1');
        expect(accessor.get('key2')).toBe('value2');
    });

    it('handles boolean variants', () => {
        const yamlData = `a: True\nb: FALSE\nc: False`;
        const accessor = YamlAccessor.from(yamlData);
        expect(accessor.get('a')).toBe(true);
        expect(accessor.get('b')).toBe(false);
        expect(accessor.get('c')).toBe(false);
    });

    it('rejects invalid YAML with stray lines', () => {
        const yamlData = `key: value\n- stray item\nother: data`;
        expect(() => YamlAccessor.from(yamlData)).toThrow();
    });

    it('handles array followed by non-dash line returning to parent', () => {
        const yamlData = `list:\n  - item1\n  - item2\nnext: value`;
        const accessor = YamlAccessor.from(yamlData);
        expect(accessor.get('list')).toEqual(['item1', 'item2']);
        expect(accessor.get('next')).toBe('value');
    });

    it('parses nested keys correctly', () => {
        const yamlData = `parent:\n  child: value\nsibling: ok`;
        const accessor = YamlAccessor.from(yamlData);
        expect(accessor.get('parent.child')).toBe('value');
        expect(accessor.get('sibling')).toBe('ok');
    });

    it('handles pipe multiline indicator with nested object', () => {
        const yamlData = `config: |\n  line1\n  line2\nafter: done`;
        const accessor = YamlAccessor.from(yamlData);
        expect(accessor.has('after')).toBe(true);
    });

    it('handles empty YAML returning empty object', () => {
        const accessor = YamlAccessor.from('   ');
        expect(accessor.toArray()).toEqual({});
    });

    describe('with registered parser plugin', () => {
        beforeEach(() => {
            PluginRegistry.reset();
        });

        it('uses registered parser plugin instead of js-yaml', () => {
            PluginRegistry.registerParser('yaml', {
                parse: (input: string) => ({ custom: true, raw: input.substring(0, 5) }),
            });
            const accessor = YamlAccessor.from('name: test');
            expect(accessor.get('custom')).toBe(true);
            expect(accessor.get('raw')).toBe('name:');
        });
    });
});
