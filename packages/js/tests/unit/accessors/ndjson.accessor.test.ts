import { describe, it, expect } from 'vitest';
import { NdjsonAccessor } from '../../../src/accessors/ndjson.accessor';
import { SafeAccess } from '../../../src/safe-access';
import { InvalidFormatError } from '../../../src/exceptions/invalid-format.error';

describe(NdjsonAccessor.name, () => {
    const ndjson = '{"name":"Ana","age":30}\n{"name":"Bob","age":25}\n{"name":"Carlos","age":35}';

    it('parses NDJSON string into indexed records', () => {
        const acc = NdjsonAccessor.from(ndjson);
        expect(acc.get('0.name')).toBe('Ana');
        expect(acc.get('1.name')).toBe('Bob');
        expect(acc.get('2.age')).toBe(35);
    });

    it('handles empty NDJSON string', () => {
        const acc = NdjsonAccessor.from('');
        expect(acc.all()).toEqual({});
    });

    it('handles single-line NDJSON', () => {
        const acc = NdjsonAccessor.from('{"key":"value"}');
        expect(acc.get('0.key')).toBe('value');
    });

    it('ignores blank lines', () => {
        const acc = NdjsonAccessor.from('{"a":1}\n\n{"b":2}\n');
        expect(acc.get('0.a')).toBe(1);
        expect(acc.get('1.b')).toBe(2);
    });

    it('throws on non-string input', () => {
        expect(() => NdjsonAccessor.from(123)).toThrow(InvalidFormatError);
    });

    it('throws on invalid JSON line', () => {
        expect(() => NdjsonAccessor.from('{"valid":true}\nnot-json')).toThrow(InvalidFormatError);
    });

    it('supports set/remove/merge (immutable)', () => {
        const acc = NdjsonAccessor.from(ndjson);
        const updated = acc.set('0.name', 'Ana Maria');
        expect(updated.get('0.name')).toBe('Ana Maria');
        expect(acc.get('0.name')).toBe('Ana'); // original unchanged
    });

    it('supports wildcard paths', () => {
        const acc = NdjsonAccessor.from(ndjson);
        expect(acc.get('*.name')).toEqual(['Ana', 'Bob', 'Carlos']);
    });

    it('clone produces NdjsonAccessor', () => {
        const acc = NdjsonAccessor.from(ndjson);
        const cloned = acc.clone({ '0': { key: 'val' } });
        expect(cloned).toBeInstanceOf(NdjsonAccessor);
        expect(cloned.get('0.key')).toBe('val');
    });

    it('toNdjson serializes back to NDJSON', () => {
        const acc = NdjsonAccessor.from(ndjson);
        const output = acc.toNdjson();
        const lines = output.split('\n');
        expect(lines).toHaveLength(3);
        expect(JSON.parse(lines[0])).toEqual({ name: 'Ana', age: 30 });
    });
});

describe('SafeAccess.fromNdjson()', () => {
    it('creates NdjsonAccessor via SafeAccess facade', () => {
        const acc = SafeAccess.fromNdjson('{"x":1}\n{"y":2}');
        expect(acc).toBeInstanceOf(NdjsonAccessor);
        expect(acc.get('0.x')).toBe(1);
    });

    it('from() with format "ndjson"', () => {
        const acc = SafeAccess.from('{"x":1}\n{"y":2}', 'ndjson');
        expect(acc).toBeInstanceOf(NdjsonAccessor);
    });
});
