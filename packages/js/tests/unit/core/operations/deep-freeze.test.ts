import { describe, it, expect } from 'vitest';
import { deepFreeze } from '../../../../src/core/operations/deep-freeze';
import { ReadonlyViolationError } from '../../../../src/exceptions/readonly-violation.error';
import { JsonAccessor } from '../../../../src/accessors/json.accessor';

describe(deepFreeze.name, () => {
    it('freezes an object deeply', () => {
        const obj = { a: { b: { c: 1 } }, d: [1, 2, 3] };
        const frozen = deepFreeze(obj);
        expect(Object.isFrozen(frozen)).toBe(true);
        expect(Object.isFrozen(frozen.a)).toBe(true);
        expect(Object.isFrozen(frozen.a.b)).toBe(true);
        expect(Object.isFrozen(frozen.d)).toBe(true);
    });

    it('handles circular references', () => {
        const obj: Record<string, unknown> = { a: 1 };
        obj.self = obj;
        expect(() => deepFreeze(obj)).not.toThrow();
        expect(Object.isFrozen(obj)).toBe(true);
    });

    it('handles empty objects', () => {
        const obj = {};
        const frozen = deepFreeze(obj);
        expect(Object.isFrozen(frozen)).toBe(true);
    });

    it('freezes non-enumerable nested properties', () => {
        const inner = { value: 42 };
        const obj: Record<string, unknown> = { visible: 'yes' };
        Object.defineProperty(obj, 'hidden', {
            value: inner,
            enumerable: false,
            writable: false,
            configurable: false,
        });
        deepFreeze(obj);
        expect(Object.isFrozen(inner)).toBe(true);
        expect(() => {
            (inner as Record<string, unknown>).value = 99;
        }).toThrow();
    });
});

describe(ReadonlyViolationError.name, () => {
    it('has correct name and message', () => {
        const err = new ReadonlyViolationError();
        expect(err.name).toBe('ReadonlyViolationError');
        expect(err.message).toBe('Cannot modify a readonly accessor.');
    });

    it('accepts custom message', () => {
        const err = new ReadonlyViolationError('Custom message');
        expect(err.message).toBe('Custom message');
    });
});

describe('Readonly accessor', () => {
    it('allows read operations on readonly accessor', () => {
        const acc = new (class extends JsonAccessor {
            constructor() {
                super('{"db":{"host":"localhost","port":5432}}', { readonly: true });
            }
        })();
        expect(acc.get('db.host')).toBe('localhost');
        expect(acc.has('db.port')).toBe(true);
        expect(acc.keys('db')).toEqual(['host', 'port']);
    });

    it('throws ReadonlyViolationError on set()', () => {
        const acc = new (class extends JsonAccessor {
            constructor() {
                super('{"a":1}', { readonly: true });
            }
        })();
        expect(() => acc.set('a', 2)).toThrow(ReadonlyViolationError);
    });

    it('throws ReadonlyViolationError on remove()', () => {
        const acc = new (class extends JsonAccessor {
            constructor() {
                super('{"a":1}', { readonly: true });
            }
        })();
        expect(() => acc.remove('a')).toThrow(ReadonlyViolationError);
    });

    it('throws ReadonlyViolationError on merge()', () => {
        const acc = new (class extends JsonAccessor {
            constructor() {
                super('{"a":1}', { readonly: true });
            }
        })();
        expect(() => acc.merge({ b: 2 })).toThrow(ReadonlyViolationError);
    });

    it('throws ReadonlyViolationError on applyPatch()', () => {
        const acc = new (class extends JsonAccessor {
            constructor() {
                super('{"a":1}', { readonly: true });
            }
        })();
        expect(() => acc.applyPatch([{ op: 'add', path: '/b', value: 2 }])).toThrow(
            ReadonlyViolationError,
        );
    });
});
