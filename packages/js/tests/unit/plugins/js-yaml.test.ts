import { describe, it, expect } from 'vitest';
import { JsYamlSerializer } from '../../../src/plugins/js-yaml.serializer';
import { JsYamlParser } from '../../../src/plugins/js-yaml.parser';

describe('JsYamlSerializer', () => {
    it('serializes a flat object', () => {
        const serializer = new JsYamlSerializer();
        const result = serializer.serialize({ name: 'Ana', age: 30 });
        expect(result).toContain('name: Ana');
        expect(result).toContain('age: 30');
    });

    it('serializes nested objects', () => {
        const serializer = new JsYamlSerializer();
        const result = serializer.serialize({ db: { host: 'localhost', port: 3306 } });
        expect(result).toContain('db:');
        expect(result).toContain('host: localhost');
    });

    it('roundtrips with JsYamlParser', () => {
        const serializer = new JsYamlSerializer();
        const parser = new JsYamlParser();
        const data = { name: 'Ana', items: ['a', 'b'] };
        const yaml = serializer.serialize(data);
        const parsed = parser.parse(yaml);
        expect(parsed).toEqual(data);
    });

    it('respects custom indent', () => {
        const serializer = new JsYamlSerializer(4);
        const result = serializer.serialize({ db: { host: 'localhost' } });
        expect(result).toContain('    host: localhost');
    });
});

describe('JsYamlParser', () => {
    it('parses a flat YAML string', () => {
        const parser = new JsYamlParser();
        const result = parser.parse('name: Ana\nage: 30');
        expect(result).toEqual({ name: 'Ana', age: 30 });
    });

    it('returns empty object for empty YAML', () => {
        const parser = new JsYamlParser();
        const result = parser.parse('');
        expect(result).toEqual({});
    });
});
