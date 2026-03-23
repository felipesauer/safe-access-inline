import { describe, it, expect } from 'vitest';
import { SafeAccess } from '../src/safe-access';
import type { CacheInterface } from '../src/contracts/cache.interface';
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

    it('remember() and forget() works', () => {
        const map = new Map<string, unknown>();
        const cache: CacheInterface = {
            get: (k) => map.get(k),
            set: (k, v) => map.set(k, v),
            delete: (k) => map.delete(k),
        };

        const acc = SafeAccess.fromObject({ b: 2 });
        acc.remember(cache, 60, 'my-key');
        expect(map.has('my-key')).toBe(true);

        const hit = SafeAccess.fromObject({}).remember(cache, 60, 'my-key');
        expect(hit.get('b')).toBe(2);

        hit.forget(cache, 'my-key');
        expect(map.has('my-key')).toBe(false);
    });
});
