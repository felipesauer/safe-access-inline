import { describe, it, expect } from 'vitest';
import {
    assertPayloadSize,
    assertMaxKeys,
    assertMaxDepth,
    assertMaxStructuralDepth,
    DEFAULT_SECURITY_OPTIONS,
} from '../../../src/core/security-options';
import { SecurityError } from '../../../src/exceptions/security.error';

describe('SecurityOptions', () => {
    describe('assertPayloadSize', () => {
        it('allows payload within limits', () => {
            expect(() => assertPayloadSize('hello')).not.toThrow();
        });

        it('throws for payload exceeding default limit', () => {
            const huge = 'x'.repeat(DEFAULT_SECURITY_OPTIONS.maxPayloadBytes + 1);
            expect(() => assertPayloadSize(huge)).toThrow(SecurityError);
        });

        it('throws for payload exceeding custom limit', () => {
            expect(() => assertPayloadSize('hello world', 5)).toThrow(SecurityError);
            expect(() => assertPayloadSize('hello world', 5)).toThrow('exceeds maximum');
        });

        it('allows payload at exact limit', () => {
            expect(() => assertPayloadSize('hello', 5)).not.toThrow();
        });
    });

    describe('assertMaxKeys', () => {
        it('allows data within key limits', () => {
            expect(() => assertMaxKeys({ a: 1, b: 2 })).not.toThrow();
        });

        it('throws when key count exceeds limit', () => {
            const data: Record<string, number> = {};
            for (let i = 0; i < 11; i++) data[`k${i}`] = i;
            expect(() => assertMaxKeys(data, 5)).toThrow(SecurityError);
            expect(() => assertMaxKeys(data, 5)).toThrow('exceeding maximum');
        });

        it('counts nested keys', () => {
            const data = { a: { b: { c: 1 } } };
            // a + b + c = 3 total keys
            expect(() => assertMaxKeys(data, 2)).toThrow(SecurityError);
        });

        it('counts array elements', () => {
            const data = { items: [1, 2, 3] };
            // items + [3 elements] = 4 total
            expect(() => assertMaxKeys(data, 3)).toThrow(SecurityError);
        });
    });

    describe('assertMaxDepth', () => {
        it('allows depth within limits', () => {
            expect(() => assertMaxDepth(10)).not.toThrow();
        });

        it('throws when depth exceeds default limit', () => {
            expect(() => assertMaxDepth(513)).toThrow(SecurityError);
        });

        it('throws when depth exceeds custom limit', () => {
            expect(() => assertMaxDepth(11, 10)).toThrow(SecurityError);
            expect(() => assertMaxDepth(11, 10)).toThrow('exceeds maximum');
        });

        it('allows depth at exact limit', () => {
            expect(() => assertMaxDepth(512)).not.toThrow();
        });
    });

    describe('DEFAULT_SECURITY_OPTIONS', () => {
        it('has sensible defaults', () => {
            expect(DEFAULT_SECURITY_OPTIONS.maxDepth).toBe(512);
            expect(DEFAULT_SECURITY_OPTIONS.maxPayloadBytes).toBe(10 * 1024 * 1024);
            expect(DEFAULT_SECURITY_OPTIONS.maxKeys).toBe(10_000);
        });
    });

    describe('assertMaxStructuralDepth', () => {
        it('allows data within depth limit', () => {
            expect(() => assertMaxStructuralDepth({ a: { b: 1 } }, 5)).not.toThrow();
        });

        it('throws when structural depth exceeds limit', () => {
            const deep = { a: { b: { c: { d: 1 } } } };
            expect(() => assertMaxStructuralDepth(deep, 2)).toThrow(SecurityError);
            expect(() => assertMaxStructuralDepth(deep, 2)).toThrow('exceeds policy maximum');
        });

        it('handles circular references without infinite recursion', () => {
            const obj: Record<string, unknown> = { a: 1 };
            obj['self'] = obj;
            expect(() => assertMaxStructuralDepth(obj, 100)).not.toThrow();
        });

        it('measures depth of arrays', () => {
            const data = { items: [1, 2, [3, 4]] };
            expect(() => assertMaxStructuralDepth(data, 10)).not.toThrow();
        });
    });
});
