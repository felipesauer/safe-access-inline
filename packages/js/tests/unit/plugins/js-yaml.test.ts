import { describe, it, expect } from 'vitest';
import { JsYamlSerializer } from '../../../src/plugins/js-yaml.serializer';
import { JsYamlParser } from '../../../src/plugins/js-yaml.parser';

describe(JsYamlSerializer.name, () => {
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

describe(JsYamlParser.name, () => {
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

    // ── Security regression: JSON_SCHEMA must be applied ──────────────────
    it('rejects !!js/function tags — does not execute arbitrary code', () => {
        // js-yaml default schema recognises !!js/function and !!js/regexp.
        // JsYamlParser must use JSON_SCHEMA to prevent this downgrade.
        // With JSON_SCHEMA, this tag is unrecognised and js-yaml throws a YAMLException.
        const parser = new JsYamlParser();
        expect(() => parser.parse('fn: !!js/function "function(){ return 42; }"')).toThrow();
    });

    it('rejects !!js/regexp tags — does not construct arbitrary RegExp objects', () => {
        const parser = new JsYamlParser();
        expect(() => parser.parse('pattern: !!js/regexp /.*/')).toThrow();
    });

    it('accepts valid JSON-schema-safe YAML tags (null, bool, int, float, str)', () => {
        const parser = new JsYamlParser();
        const result = parser.parse(
            'active: true\ncount: 42\nratio: 1.5\nlabel: text\nempty: null',
        );
        expect(result).toEqual({ active: true, count: 42, ratio: 1.5, label: 'text', empty: null });
    });
});
