import { describe, it, expect } from 'vitest';
import { sanitizeCsvCell, sanitizeCsvRow } from '../../../src/core/csv-sanitizer';
import { SecurityError } from '../../../src/exceptions/security.error';

describe('CsvSanitizer', () => {
    describe('sanitizeCsvCell', () => {
        it('returns cell unchanged in none mode', () => {
            expect(sanitizeCsvCell('=SUM(A1)', 'none')).toBe('=SUM(A1)');
        });

        it('returns safe cell unchanged in any mode', () => {
            expect(sanitizeCsvCell('hello', 'prefix')).toBe('hello');
            expect(sanitizeCsvCell('hello', 'strip')).toBe('hello');
            expect(sanitizeCsvCell('hello', 'error')).toBe('hello');
        });

        it('prefixes dangerous cells in prefix mode', () => {
            expect(sanitizeCsvCell('=SUM(A1)', 'prefix')).toBe("'=SUM(A1)");
            expect(sanitizeCsvCell('+cmd', 'prefix')).toBe("'+cmd");
            expect(sanitizeCsvCell('-cmd', 'prefix')).toBe("'-cmd");
            expect(sanitizeCsvCell('@import', 'prefix')).toBe("'@import");
        });

        it('strips dangerous prefixes in strip mode', () => {
            expect(sanitizeCsvCell('=SUM(A1)', 'strip')).toBe('SUM(A1)');
            expect(sanitizeCsvCell('++cmd', 'strip')).toBe('cmd');
            expect(sanitizeCsvCell('-@@val', 'strip')).toBe('val');
        });

        it('throws in error mode for dangerous cells', () => {
            expect(() => sanitizeCsvCell('=SUM(A1)', 'error')).toThrow(SecurityError);
            expect(() => sanitizeCsvCell('=SUM(A1)', 'error')).toThrow("dangerous character: '='");
        });

        it('handles tab and carriage return prefixes', () => {
            expect(sanitizeCsvCell('\tcmd', 'prefix')).toBe("'\tcmd");
            expect(sanitizeCsvCell('\rcmd', 'prefix')).toBe("'\rcmd");
        });

        it('handles newline prefix in prefix mode', () => {
            expect(sanitizeCsvCell('\ncmd', 'prefix')).toBe("'\ncmd");
        });

        it('strips newline prefix in strip mode', () => {
            expect(sanitizeCsvCell('\ncmd', 'strip')).toBe('cmd');
        });

        it('throws on newline prefix in error mode', () => {
            expect(() => sanitizeCsvCell('\ncmd', 'error')).toThrow(SecurityError);
        });

        it('defaults to none mode', () => {
            expect(sanitizeCsvCell('=SUM(A1)')).toBe('=SUM(A1)');
        });
    });

    describe('sanitizeCsvRow', () => {
        it('sanitizes all cells in a row', () => {
            const row = ['=SUM(A1)', 'safe', '+cmd'];
            expect(sanitizeCsvRow(row, 'prefix')).toEqual(["'=SUM(A1)", 'safe', "'+cmd"]);
        });

        it('returns row unchanged in none mode', () => {
            const row = ['=SUM(A1)', '+cmd'];
            expect(sanitizeCsvRow(row, 'none')).toEqual(['=SUM(A1)', '+cmd']);
        });

        it('defaults to none mode', () => {
            const row = ['=SUM(A1)'];
            expect(sanitizeCsvRow(row)).toEqual(['=SUM(A1)']);
        });
    });
});
