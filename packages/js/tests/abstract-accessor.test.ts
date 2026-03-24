import { describe, it, expect } from 'vitest';
import { SafeAccess } from '../src/safe-access';
import { ReadonlyViolationError } from '../src/exceptions/readonly-violation.error';

describe('AbstractAccessor modifications', () => {
    it('freeze() makes it readonly', () => {
        const acc = SafeAccess.fromObject({ a: 1 });
        const frozen = acc.freeze();
        expect(frozen.get('a')).toBe(1);
        expect(() => frozen.set('a', 2)).toThrow(ReadonlyViolationError);
        // original still mutable — set() returns a new accessor (immutable pattern)
        const updated = acc.set('a', 2);
        expect(updated.get('a')).toBe(2);
        // original is unchanged
        expect(acc.get('a')).toBe(1);
    });
});
