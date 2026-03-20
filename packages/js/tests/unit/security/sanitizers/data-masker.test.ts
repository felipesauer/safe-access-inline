import { describe, it, expect } from 'vitest';
import { mask } from '../../../../src/security/sanitizers/data-masker';
import { SafeAccess } from '../../../../src/safe-access';

describe('DataMasker', () => {
    describe('mask()', () => {
        it('redacts common sensitive keys', () => {
            const data = { username: 'john', password: 'secret123', email: 'john@test.com' };
            const result = mask(data);
            expect(result.username).toBe('john');
            expect(result.password).toBe('[REDACTED]');
            expect(result.email).toBe('john@test.com');
        });

        it('redacts nested sensitive keys', () => {
            const data = { db: { host: 'localhost', password: 'dbpass' } };
            const result = mask(data);
            expect(result).toEqual({ db: { host: 'localhost', password: '[REDACTED]' } });
        });

        it('redacts all common sensitive key names', () => {
            const data = {
                password: '1',
                secret: '2',
                token: '3',
                api_key: '4',
                apikey: '5',
                private_key: '6',
                passphrase: '7',
                credential: '8',
                auth: '9',
                authorization: '10',
                cookie: '11',
                session: '12',
                ssn: '13',
                credit_card: '14',
            };
            const result = mask(data);
            for (const val of Object.values(result)) {
                expect(val).toBe('[REDACTED]');
            }
        });

        it('supports custom string patterns', () => {
            const data = { my_field: 'value', other: 'keep' };
            const result = mask(data, ['my_field']);
            expect(result.my_field).toBe('[REDACTED]');
            expect(result.other).toBe('keep');
        });

        it('supports wildcard patterns', () => {
            const data = { db_password: 'x', db_host: 'y', cache_key: 'z' };
            const result = mask(data, ['db_*']);
            expect(result.db_password).toBe('[REDACTED]');
            expect(result.db_host).toBe('[REDACTED]');
            expect(result.cache_key).toBe('z'); // not matched by db_* pattern
        });

        it('supports RegExp patterns', () => {
            const data = { x_key_1: 'a', x_key_2: 'b', y_val: 'c' };
            const result = mask(data, [/^x_key/]);
            expect(result.x_key_1).toBe('[REDACTED]');
            expect(result.x_key_2).toBe('[REDACTED]');
            expect(result.y_val).toBe('c');
        });

        it('handles arrays with objects', () => {
            const data = {
                users: [
                    { name: 'A', password: 'p1' },
                    { name: 'B', password: 'p2' },
                ],
            };
            const result = mask(data) as { users: Array<{ name: string; password: string }> };
            expect(result.users[0].name).toBe('A');
            expect(result.users[0].password).toBe('[REDACTED]');
            expect(result.users[1].password).toBe('[REDACTED]');
        });

        it('does not mutate original data', () => {
            const data = { password: 'secret' };
            const result = mask(data);
            expect(data.password).toBe('secret');
            expect(result.password).toBe('[REDACTED]');
        });

        it('handles empty data', () => {
            expect(mask({})).toEqual({});
        });

        it('is case-insensitive for common keys', () => {
            const data = { Password: 'x', TOKEN: 'y', Api_Key: 'z' };
            const result = mask(data);
            expect(result.Password).toBe('[REDACTED]');
            expect(result.TOKEN).toBe('[REDACTED]');
            expect(result.Api_Key).toBe('[REDACTED]');
        });
    });

    describe('AbstractAccessor.mask()', () => {
        it('returns a new accessor with masked data', () => {
            const accessor = SafeAccess.fromJson('{"user":"john","password":"secret"}');
            const masked = accessor.mask();
            expect(masked.get('user')).toBe('john');
            expect(masked.get('password')).toBe('[REDACTED]');
            // original unchanged
            expect(accessor.get('password')).toBe('secret');
        });

        it('accepts custom patterns', () => {
            const accessor = SafeAccess.fromJson('{"my_field":"val","other":"keep"}');
            const masked = accessor.mask(['my_field']);
            expect(masked.get('my_field')).toBe('[REDACTED]');
            expect(masked.get('other')).toBe('keep');
        });
    });
});

// ── Data Masker — depth limit ───────────────────────────────────
describe('DataMasker — edge cases', () => {
    it('stops recursion at depth > 100', () => {
        let obj: Record<string, unknown> = { password: 'secret' };
        for (let i = 0; i < 110; i++) {
            obj = { nested: obj };
        }
        const result = mask(obj);
        let current: Record<string, unknown> = result;
        for (let i = 0; i < 110; i++) {
            current = current.nested as Record<string, unknown>;
        }
        expect(current.password).toBe('secret');
    });

    it('masks keys inside array items', () => {
        const data = { items: [{ password: 'abc' }, { name: 'ok' }] };
        const result = mask(data);
        expect((result.items as Record<string, unknown>[])[0].password).toBe('[REDACTED]');
        expect((result.items as Record<string, unknown>[])[1].name).toBe('ok');
    });
});

// ── DataMasker — wildcard and edge cases ────────────────────────
describe('DataMasker — wildcard edge cases', () => {
    it('masks all keys with bare "*" wildcard pattern', () => {
        const data = { name: 'visible', role: 'admin' };
        const result = mask(data, ['*']);
        expect(result.name).toBe('[REDACTED]');
        expect(result.role).toBe('[REDACTED]');
    });

    it('handles pattern with wildcard AND regex special chars (non-* escaping)', () => {
        const data = { price$usd: 100, other: 'keep' };
        const result = mask(data, ['price$*']);
        expect(result['price$usd']).toBe('[REDACTED]');
        expect(result.other).toBe('keep');
    });

    it('skips primitive items (non-objects) inside arrays', () => {
        const data = { items: ['string-value', 42, null, { password: 'secret' }] };
        const result = mask(data) as { items: unknown[] };
        expect(result.items[0]).toBe('string-value');
        expect(result.items[1]).toBe(42);
        expect(result.items[2]).toBeNull();
        expect((result.items[3] as Record<string, unknown>).password).toBe('[REDACTED]');
    });
});
