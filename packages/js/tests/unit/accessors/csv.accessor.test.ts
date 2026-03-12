import { describe, it, expect } from 'vitest';
import { CsvAccessor } from '../../../src/accessors/csv.accessor';
import { InvalidFormatError } from '../../../src/exceptions/invalid-format.error';

describe(CsvAccessor.name, () => {
    const csv = `name,age,city
Ana,30,Porto Alegre
Bob,25,São Paulo
Carol,35,Curitiba`;

    it('from — valid CSV string', () => {
        const accessor = CsvAccessor.from(csv);
        expect(accessor).toBeInstanceOf(CsvAccessor);
    });

    it('from — invalid type throws', () => {
        expect(() => CsvAccessor.from(123)).toThrow(InvalidFormatError);
    });

    it('get — row by index', () => {
        const accessor = CsvAccessor.from(csv);
        const row = accessor.get('0') as Record<string, unknown>;
        expect(row.name).toBe('Ana');
        expect(row.age).toBe('30');
        expect(row.city).toBe('Porto Alegre');
    });

    it('get — specific field in row', () => {
        const accessor = CsvAccessor.from(csv);
        expect(accessor.get('1.name')).toBe('Bob');
        expect(accessor.get('2.city')).toBe('Curitiba');
    });

    it('get — wildcard', () => {
        const accessor = CsvAccessor.from(csv);
        expect(accessor.get('*.name')).toEqual(['Ana', 'Bob', 'Carol']);
    });

    it('get — nonexistent returns default', () => {
        const accessor = CsvAccessor.from(csv);
        expect(accessor.get('99.name', 'fallback')).toBe('fallback');
    });

    it('has — existing', () => {
        const accessor = CsvAccessor.from(csv);
        expect(accessor.has('0')).toBe(true);
        expect(accessor.has('0.name')).toBe(true);
    });

    it('has — nonexistent', () => {
        const accessor = CsvAccessor.from(csv);
        expect(accessor.has('99')).toBe(false);
    });

    it('count — rows', () => {
        const accessor = CsvAccessor.from(csv);
        expect(accessor.count()).toBe(3);
    });

    it('toArray', () => {
        const accessor = CsvAccessor.from(csv);
        const arr = accessor.toArray();
        expect(Object.keys(arr).length).toBe(3);
    });

    it('toJson', () => {
        const accessor = CsvAccessor.from(csv);
        const json = accessor.toJson();
        expect(() => JSON.parse(json)).not.toThrow();
    });

    it('empty CSV', () => {
        const accessor = CsvAccessor.from('');
        expect(accessor.count()).toBe(0);
    });

    it('handles quoted fields', () => {
        const quotedCsv = `name,desc
"Ana","She said ""hello""!"
Bob,Simple`;
        const accessor = CsvAccessor.from(quotedCsv);
        expect(accessor.get('0.name')).toBe('Ana');
        expect(accessor.get('0.desc')).toBe('She said "hello"!');
    });

    it('set — immutable', () => {
        const accessor = CsvAccessor.from(csv);
        const newAccessor = accessor.set('0.name', 'Changed');
        expect(newAccessor.get('0.name')).toBe('Changed');
        expect(accessor.get('0.name')).toBe('Ana');
    });

    it('remove — existing', () => {
        const accessor = CsvAccessor.from(csv);
        const newAccessor = accessor.remove('2');
        expect(newAccessor.has('2')).toBe(false);
    });

    it('skips rows with mismatched column count', () => {
        const badCsv = `name,age\nAna,30\nBob`;
        const accessor = CsvAccessor.from(badCsv);
        expect(accessor.count()).toBe(1);
        expect(accessor.get('0.name')).toBe('Ana');
    });
});
