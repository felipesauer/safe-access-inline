import { describe, it, expect } from 'vitest';
import { SmolTomlSerializer } from '../../../src/plugins/smol-toml.serializer';
import { SmolTomlParser } from '../../../src/plugins/smol-toml.parser';

describe('SmolTomlSerializer', () => {
    it('serializes a flat object', () => {
        const serializer = new SmolTomlSerializer();
        const result = serializer.serialize({ name: 'Ana', age: 30 });
        expect(result).toContain('name = "Ana"');
        expect(result).toContain('age = 30');
    });

    it('serializes nested objects', () => {
        const serializer = new SmolTomlSerializer();
        const result = serializer.serialize({ db: { host: 'localhost', port: 3306 } });
        expect(result).toContain('[db]');
        expect(result).toContain('host = "localhost"');
    });

    it('roundtrips with SmolTomlParser', () => {
        const serializer = new SmolTomlSerializer();
        const parser = new SmolTomlParser();
        const data = { name: 'Ana', count: 5 };
        const toml = serializer.serialize(data);
        const parsed = parser.parse(toml);
        expect(parsed).toEqual(data);
    });
});

describe('SmolTomlParser', () => {
    it('parses a flat TOML string', () => {
        const parser = new SmolTomlParser();
        const result = parser.parse('name = "Ana"\nage = 30');
        expect(result).toEqual({ name: 'Ana', age: 30 });
    });

    it('parses TOML with tables', () => {
        const parser = new SmolTomlParser();
        const result = parser.parse('[server]\nhost = "localhost"\nport = 8080');
        expect(result).toEqual({ server: { host: 'localhost', port: 8080 } });
    });
});
