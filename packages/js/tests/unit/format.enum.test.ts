import { describe, it, expect } from 'vitest';
import { Format } from '../../src/enums/format.enum';

describe('Format enum', () => {
    it('has correct values for all members', () => {
        expect(Format.Array).toBe('array');
        expect(Format.Object).toBe('object');
        expect(Format.Json).toBe('json');
        expect(Format.Xml).toBe('xml');
        expect(Format.Yaml).toBe('yaml');
        expect(Format.Toml).toBe('toml');
        expect(Format.Ini).toBe('ini');
        expect(Format.Env).toBe('env');
    });

    it('contains exactly 9 members', () => {
        expect(Object.keys(Format)).toHaveLength(9);
    });
});
