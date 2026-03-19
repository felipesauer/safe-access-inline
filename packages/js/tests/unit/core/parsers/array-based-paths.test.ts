import { describe, it, expect } from 'vitest';
import { SafeAccess } from '../../../../src/safe-access';
import { DotNotationParser } from '../../../../src/core/parsers/dot-notation-parser';
import { SecurityError } from '../../../../src/exceptions/security.error';

describe('Array-based Paths', () => {
    const acc = SafeAccess.fromJson('{"user":{"name":"Ana","address":{"city":"SP"}}}');

    it('getAt retrieves values using segment array', () => {
        expect(acc.getAt(['user', 'name'])).toBe('Ana');
        expect(acc.getAt(['user', 'address', 'city'])).toBe('SP');
    });

    it('getAt returns default for missing path', () => {
        expect(acc.getAt(['user', 'missing'], 'fallback')).toBe('fallback');
    });

    it('hasAt checks existence', () => {
        expect(acc.hasAt(['user', 'name'])).toBe(true);
        expect(acc.hasAt(['user', 'missing'])).toBe(false);
    });

    it('setAt sets value by segments', () => {
        const result = acc.setAt(['user', 'age'], 30);
        expect(result.getAt(['user', 'age'])).toBe(30);
    });

    it('removeAt removes value by segments', () => {
        const result = acc.removeAt(['user', 'name']);
        expect(result.hasAt(['user', 'name'])).toBe(false);
        expect(result.hasAt(['user', 'address'])).toBe(true);
    });

    it('setAt rejects prototype pollution', () => {
        expect(() => acc.setAt(['__proto__', 'hacked'], true)).toThrow(SecurityError);
    });

    it('segments are literal (no wildcard interpretation)', () => {
        const data = SafeAccess.fromJson('{"*":{"value":1},"a.b":{"value":2}}');
        expect(data.getAt(['*', 'value'])).toBe(1);
    });
});

describe('Template Paths', () => {
    it('renders template path with bindings', () => {
        const result = DotNotationParser.renderTemplate('users.{id}.name', { id: 42 });
        expect(result).toBe('users.42.name');
    });

    it('throws for missing binding', () => {
        expect(() => DotNotationParser.renderTemplate('users.{id}.name', {})).toThrow(
            "Missing binding for key 'id'",
        );
    });

    it('works with accessor get', () => {
        const acc = SafeAccess.fromJson('{"users":{"42":{"name":"Ana"}}}');
        const path = DotNotationParser.renderTemplate('users.{id}.name', { id: 42 });
        expect(acc.get(path)).toBe('Ana');
    });
});
