import { describe, it, expect } from 'vitest';
import { JsonAccessor } from '../../../src/accessors/json.accessor';
import { InvalidFormatError } from '../../../src/exceptions/invalid-format.error';

describe(JsonAccessor.name, () => {
    it('from — valid JSON string', () => {
        const accessor = JsonAccessor.from('{"name": "Ana"}');
        expect(accessor).toBeInstanceOf(JsonAccessor);
    });

    it('from — invalid type throws', () => {
        expect(() => JsonAccessor.from(123)).toThrow(InvalidFormatError);
    });

    it('from — invalid JSON throws', () => {
        expect(() => JsonAccessor.from('{invalid json}')).toThrow(InvalidFormatError);
    });

    it('get — simple key', () => {
        const accessor = JsonAccessor.from('{"name": "Ana", "age": 30}');
        expect(accessor.get('name')).toBe('Ana');
        expect(accessor.get('age')).toBe(30);
    });

    it('get — nested', () => {
        const accessor = JsonAccessor.from('{"user": {"profile": {"name": "Ana"}}}');
        expect(accessor.get('user.profile.name')).toBe('Ana');
    });

    it('get — nonexistent returns default', () => {
        const accessor = JsonAccessor.from('{"a": 1}');
        expect(accessor.get('x.y', 'fallback')).toBe('fallback');
    });

    it('get — numeric index', () => {
        const accessor = JsonAccessor.from('{"items": [{"title": "A"}, {"title": "B"}]}');
        expect(accessor.get('items.0.title')).toBe('A');
        expect(accessor.get('items.1.title')).toBe('B');
    });

    it('get — wildcard', () => {
        const accessor = JsonAccessor.from('{"users": [{"name": "Ana"}, {"name": "Bob"}]}');
        expect(accessor.get('users.*.name')).toEqual(['Ana', 'Bob']);
    });

    it('has — existing', () => {
        const accessor = JsonAccessor.from('{"key": "value"}');
        expect(accessor.has('key')).toBe(true);
    });

    it('has — nonexistent', () => {
        const accessor = JsonAccessor.from('{"key": "value"}');
        expect(accessor.has('missing')).toBe(false);
    });

    it('set — immutable', () => {
        const accessor = JsonAccessor.from('{"name": "old"}');
        const newAccessor = accessor.set('name', 'new');
        expect(newAccessor.get('name')).toBe('new');
        expect(accessor.get('name')).toBe('old');
    });

    it('remove — existing', () => {
        const accessor = JsonAccessor.from('{"a": 1, "b": 2}');
        const newAccessor = accessor.remove('b');
        expect(newAccessor.has('b')).toBe(false);
    });

    it('toArray', () => {
        const accessor = JsonAccessor.from('{"name": "Ana"}');
        expect(accessor.toArray()).toEqual({ name: 'Ana' });
    });

    it('toJson', () => {
        const accessor = JsonAccessor.from('{"name": "Ana"}');
        expect(JSON.parse(accessor.toJson())).toEqual({ name: 'Ana' });
    });

    it('toJson — pretty-prints with default 2-space indent', () => {
        const accessor = JsonAccessor.from('{"a":1}');
        expect(accessor.toJson(true)).toBe('{\n  "a": 1\n}');
    });

    it('toJson — options.space overrides the pretty flag', () => {
        const accessor = JsonAccessor.from('{"a":1}');
        const result = accessor.toJson(false, { space: 4 });
        expect(result).toBe('{\n    "a": 1\n}');
    });

    it('toJson — unescapeUnicode converts control-char \\uXXXX escapes to literal chars', () => {
        // JSON.stringify always escapes U+001F (unit sep) as \u001f.
        // With unescapeUnicode: true the literal character takes its place.
        const accessor = JsonAccessor.from('{}');
        const result = accessor.set('k', '\u001F').toJson(false, { unescapeUnicode: true });
        expect(result).not.toMatch(/\\u001[Ff]/);
    });

    it('toJson — unescapeSlashes unescapes forward slashes', () => {
        const accessor = JsonAccessor.from('{}');
        const unescaped = accessor
            .set('url', 'https://example.com/path')
            .toJson(false, { unescapeSlashes: true });
        // The unescaped version has forward slashes intact (or at least no \\/)
        expect(unescaped).not.toContain('\\/');
    });

    it('toJson — options without unescapeUnicode leaves output unchanged (NUL control char)', () => {
        // NUL (\u0000) is always escaped by JSON.stringify — without unescapeUnicode it stays escaped
        const accessor = JsonAccessor.from('{}');
        const result = accessor.set('k', '\u0000').toJson(false, {});
        expect(result).toContain('\\u0000');
    });

    it('toObject', () => {
        const accessor = JsonAccessor.from('{"name": "Ana"}');
        expect(accessor.toObject()).toEqual({ name: 'Ana' });
    });

    it('type', () => {
        const accessor = JsonAccessor.from('{"s": "str", "n": 42, "b": true, "a": [1]}');
        expect(accessor.type('s')).toBe('string');
        expect(accessor.type('n')).toBe('number');
        expect(accessor.type('b')).toBe('bool');
        expect(accessor.type('a')).toBe('array');
        expect(accessor.type('missing')).toBeNull();
    });

    it('count and keys', () => {
        const accessor = JsonAccessor.from('{"a": 1, "b": 2, "c": 3}');
        expect(accessor.count()).toBe(3);
        expect(accessor.keys()).toEqual(['a', 'b', 'c']);
    });

    it('returns empty object for non-object JSON', () => {
        const accessor = JsonAccessor.from('"hello"');
        expect(accessor.all()).toEqual({});
    });

    // ── Error message content (kills StringLiteral "" mutations) ──

    it('from — error message is not empty for non-string input', () => {
        // L18 StringLiteral mutation replaces the message with "".
        expect(() => JsonAccessor.from(123)).toThrow(/JsonAccessor expects a JSON string/i);
    });

    it('parse — error message is not empty for invalid JSON', () => {
        // L28 StringLiteral mutation replaces the parse error message with "".
        expect(() => JsonAccessor.from('{ invalid }')).toThrow(/JsonAccessor failed to parse/i);
    });

    // ── parse() null-safety guard (L26 ConditionalExpression=true) ──

    it('parsing JSON null returns empty object (kills ConditionalExpression=true)', () => {
        // With the guard forced to true: parsed=null is returned from parse() as data,
        // then any method call that runs Object.keys(null) throws a TypeError.
        const accessor = JsonAccessor.from('null');
        expect(() => accessor.count()).not.toThrow();
        expect(accessor.count()).toBe(0);
    });
});
