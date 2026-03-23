/**
 * Unit tests for parseCsvLine — the inline CSV line parser used by streamLines.
 * Covers the quoted-field code paths (lines 43–56) that are unreachable via the
 * high-level SafeAccess.streamCsv fixture (which uses an unquoted CSV file).
 */
import { describe, it, expect } from 'vitest';
import { parseCsvLine } from '../../../../src/core/io/stream-reader';

describe('parseCsvLine', () => {
    it('parses a plain unquoted CSV line', () => {
        expect(parseCsvLine('Ana,25,ana@example.com')).toEqual(['Ana', '25', 'ana@example.com']);
    });

    it('parses a line with a double-quoted field (inQuotes = true branch)', () => {
        // Covers line 56: `inQuotes = true` when ch === '"' in the else block
        expect(parseCsvLine('"Ana",25')).toEqual(['Ana', '25']);
    });

    it('parses characters inside a quoted field (inQuotes branch lines 44–52)', () => {
        // Covers line 52: `current += ch` while inQuotes and ch !== '"'
        expect(parseCsvLine('"Ana Lopez",25')).toEqual(['Ana Lopez', '25']);
    });

    it('handles an escaped double-quote inside a quoted field (lines 45–49)', () => {
        // Covers lines 45–47: `i + 1 < length && line[i+1] === '"' → current += '"'; i++`
        expect(parseCsvLine('"Ana ""The"" Smith",25')).toEqual(['Ana "The" Smith', '25']);
    });

    it('closes a quoted field when the closing quote is not doubled (lines 48–50)', () => {
        // Covers lines 48–50: the else branch that sets `inQuotes = false`
        expect(parseCsvLine('"hello",world')).toEqual(['hello', 'world']);
    });

    it('trims whitespace around unquoted fields', () => {
        expect(parseCsvLine(' Ana , 25 ')).toEqual(['Ana', '25']);
    });

    it('returns a single-element array for a line with no commas', () => {
        expect(parseCsvLine('alone')).toEqual(['alone']);
    });

    it('returns an empty string for an empty line', () => {
        expect(parseCsvLine('')).toEqual(['']);
    });

    it('handles consecutive commas (empty fields)', () => {
        expect(parseCsvLine('a,,c')).toEqual(['a', '', 'c']);
    });
});
