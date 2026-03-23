import { describe, it, expect } from 'vitest';
import { SecurityGuard } from '../../../../src/security/guards/security-guard';
import { SecurityError } from '../../../../src/exceptions/security.error';
import { DotNotationParser } from '../../../../src/core/parsers/dot-notation-parser';

describe(SecurityGuard.name, () => {
    // ── assertSafeKey ────────────────────────────────

    it('allows normal keys', () => {
        expect(() => SecurityGuard.assertSafeKey('name')).not.toThrow();
        expect(() => SecurityGuard.assertSafeKey('user')).not.toThrow();
        expect(() => SecurityGuard.assertSafeKey('0')).not.toThrow();
        expect(() => SecurityGuard.assertSafeKey('__name')).not.toThrow();
    });

    it('blocks __proto__', () => {
        expect(() => SecurityGuard.assertSafeKey('__proto__')).toThrow(SecurityError);
    });

    it('blocks constructor', () => {
        expect(() => SecurityGuard.assertSafeKey('constructor')).toThrow(SecurityError);
    });

    it('blocks prototype', () => {
        expect(() => SecurityGuard.assertSafeKey('prototype')).toThrow(SecurityError);
    });

    // ── sanitizeObject ───────────────────────────────

    it('removes __proto__ keys recursively', () => {
        const input = { a: 1, __proto__: { evil: true }, nested: { __proto__: { x: 1 }, b: 2 } };
        const result = SecurityGuard.sanitizeObject(input);
        expect(result).toEqual({ a: 1, nested: { b: 2 } });
    });

    it('removes constructor and prototype keys', () => {
        const obj = Object.create(null);
        obj.constructor = 'evil';
        obj.prototype = 'evil';
        obj.safe = 'ok';
        const result = SecurityGuard.sanitizeObject(obj);
        expect(result).toEqual({ safe: 'ok' });
    });

    it('handles arrays', () => {
        const input = [{ __proto__: { x: 1 }, a: 1 }, { b: 2 }];
        const result = SecurityGuard.sanitizeObject(input);
        expect(result).toEqual([{ a: 1 }, { b: 2 }]);
    });

    it('returns primitives unchanged', () => {
        expect(SecurityGuard.sanitizeObject(null)).toBeNull();
        expect(SecurityGuard.sanitizeObject('string')).toBe('string');
        expect(SecurityGuard.sanitizeObject(42)).toBe(42);
        expect(SecurityGuard.sanitizeObject(undefined)).toBeUndefined();
    });
});

describe('Prototype Pollution Protection in DotNotationParser', () => {
    it('set — blocks __proto__ path', () => {
        expect(() => DotNotationParser.set({}, '__proto__.polluted', true)).toThrow(SecurityError);
    });

    it('set — blocks constructor path', () => {
        expect(() => DotNotationParser.set({}, 'constructor.polluted', true)).toThrow(
            SecurityError,
        );
    });

    it('set — blocks prototype path', () => {
        expect(() => DotNotationParser.set({}, 'a.prototype.polluted', true)).toThrow(
            SecurityError,
        );
    });

    it('set — blocks __proto__ as final key', () => {
        expect(() => DotNotationParser.set({}, 'a.__proto__', 'evil')).toThrow(SecurityError);
    });

    it('merge — blocks __proto__ in source keys', () => {
        const data = { a: { b: 1 } };
        const malicious = Object.create(null);
        malicious.__proto__ = { polluted: true };
        expect(() => DotNotationParser.merge(data, '', malicious)).toThrow(SecurityError);
    });

    it('merge — blocks constructor in source keys', () => {
        const malicious = Object.create(null);
        malicious.constructor = { polluted: true };
        expect(() => DotNotationParser.merge({}, '', malicious)).toThrow(SecurityError);
    });

    it('set — allows normal nested paths', () => {
        const result = DotNotationParser.set({}, 'user.name', 'Ana');
        expect(result).toEqual({ user: { name: 'Ana' } });
    });
});

describe('SecurityGuard.isForbiddenKey', () => {
    it('returns true for __proto__', () => {
        expect(SecurityGuard.isForbiddenKey('__proto__')).toBe(true);
    });

    it('returns true for constructor', () => {
        expect(SecurityGuard.isForbiddenKey('constructor')).toBe(true);
    });

    it('returns false for a normal key', () => {
        expect(SecurityGuard.isForbiddenKey('name')).toBe(false);
        expect(SecurityGuard.isForbiddenKey('userId')).toBe(false);
    });
});
