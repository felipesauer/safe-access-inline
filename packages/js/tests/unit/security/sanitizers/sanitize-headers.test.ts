/**
 * Tests for sanitizeHeaders() — HTTP header sanitization (HTTP Response Splitting prevention).
 *
 * Also tests sanitizeCsvHeaders() for PHP parity with CsvSanitizer::sanitizeHeaders().
 */
import { describe, it, expect } from 'vitest';
import { sanitizeHeaders } from '../../../../src/security/sanitizers/sanitize-headers';
import { sanitizeCsvHeaders } from '../../../../src/security/sanitizers/csv-sanitizer';

describe(sanitizeHeaders.name, () => {
    // Case 1: Clean header is preserved intact
    it('preserves a clean header intact', () => {
        const result = sanitizeHeaders({ 'Content-Type': 'application/json' });
        expect(result).toEqual({ 'content-type': 'application/json' });
    });

    // Case 2: CRLF injection in value → removed/sanitized
    it('removes CRLF sequences from header values (HTTP response splitting prevention)', () => {
        const result = sanitizeHeaders({
            'X-Custom': 'hello\r\nX-Injected: evil',
        });
        expect(result['x-custom']).toBe('helloX-Injected: evil');
    });

    // Case 3: CRLF injection specifically via \r and \n individually
    it('removes standalone \\r and \\n from header values', () => {
        const result = sanitizeHeaders({ 'X-Test': 'value\revil\ninjection' });
        expect(result['x-test']).toBe('valueevilinjection');
    });

    // Case 4: Control characters in value → removed
    it('strips ASCII control characters (< 0x20 except \\t) from values', () => {
        const result = sanitizeHeaders({ 'X-Ctrl': 'hello\x01\x07world' });
        expect(result['x-ctrl']).toBe('helloworld');
    });

    // Tab (0x09) must be preserved — it is a valid HTTP header whitespace character
    it('preserves \\t (horizontal tab) in header values', () => {
        const result = sanitizeHeaders({ 'Content-Type': 'text/plain;\tcharset=utf-8' });
        expect(result['content-type']).toBe('text/plain;\tcharset=utf-8');
    });

    // Case 5: Invalid header name → dropped (not included in output)
    it('drops headers with names containing RFC 7230-invalid characters', () => {
        const result = sanitizeHeaders({
            'Bad Header!': 'value', // space and ! are not valid token chars
            'Also:Bad': 'value', // colon separator
            'valid-header': 'value',
        });
        expect(result).not.toHaveProperty('bad header!');
        expect(result).not.toHaveProperty('also:bad');
        expect(result).toHaveProperty('valid-header', 'value');
    });

    // Case 6: Names normalised to lowercase
    it('normalises header names to lowercase', () => {
        const result = sanitizeHeaders({
            'Content-Type': 'text/html',
            AUTHORIZATION: 'Bearer token',
            'X-Request-ID': 'abc-123',
        });
        expect(result).toEqual({
            'content-type': 'text/html',
            authorization: 'Bearer token',
            'x-request-id': 'abc-123',
        });
    });

    // Case 7: Empty headers {} → returns {}
    it('returns an empty object when given an empty headers map', () => {
        expect(sanitizeHeaders({})).toEqual({});
    });

    // Case 8: undefined/null → returns {} without throwing
    it('returns {} and does not throw when given undefined', () => {
        expect(() => sanitizeHeaders(undefined)).not.toThrow();
        expect(sanitizeHeaders(undefined)).toEqual({});
    });

    it('returns {} and does not throw when given null', () => {
        expect(() => sanitizeHeaders(null)).not.toThrow();
        expect(sanitizeHeaders(null)).toEqual({});
    });

    // Case 9: Multiple headers — only invalid ones are affected
    it('drops only the invalid entries while keeping valid ones', () => {
        const result = sanitizeHeaders({
            'X-Valid': 'good',
            '': 'drop-empty-name',
            'X-Clean': 'also-good',
            'bad name': 'dropped',
        });
        expect(result).toEqual({
            'x-valid': 'good',
            'x-clean': 'also-good',
        });
    });

    // Case 10: Does not mutate the original input
    it('does not mutate the original headers object', () => {
        const input = { 'X-Header': 'value\r\nevil' };
        const copy = { ...input };
        sanitizeHeaders(input);
        expect(input).toEqual(copy);
    });
});

// ── CSV Headers parity (mirrors PHP CsvSanitizer::sanitizeHeaders()) ──────

describe(sanitizeCsvHeaders.name, () => {
    it('returns headers unchanged when mode is none', () => {
        expect(sanitizeCsvHeaders(['name', 'value', '=price'], 'none')).toEqual([
            'name',
            'value',
            '=price',
        ]);
    });

    it('prefixes dangerous headers with a quote (prefix mode)', () => {
        expect(sanitizeCsvHeaders(['=SUM(A1)', 'name', '@test'], 'prefix')).toEqual([
            "'=SUM(A1)",
            'name',
            "'@test",
        ]);
    });

    it('strips dangerous prefix characters (strip mode)', () => {
        expect(sanitizeCsvHeaders(['=SUM(A1)', 'name', '+price'], 'strip')).toEqual([
            'SUM(A1)',
            'name',
            'price',
        ]);
    });

    it('throws SecurityError for dangerous headers when mode is error', () => {
        expect(() => sanitizeCsvHeaders(['=bad', 'good'], 'error')).toThrowError(
            'CSV cell starts with dangerous character',
        );
    });

    it('produces the same result as PHP CsvSanitizer::sanitizeHeaders() for strip mode', () => {
        // Cross-parity: PHP strips the same DANGEROUS_PREFIXES = ['=', '+', '-', '@', "\t", "\r", "\n"]
        const input = ['=formula', '+plus', '-minus', '@at', '\ttab', 'clean'];
        const jsResult = sanitizeCsvHeaders(input, 'strip');
        // Expected: PHP would produce ['formula', 'plus', 'minus', 'at', 'tab', 'clean']
        expect(jsResult).toEqual(['formula', 'plus', 'minus', 'at', 'tab', 'clean']);
    });
});
