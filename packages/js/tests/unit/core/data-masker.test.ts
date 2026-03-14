import { describe, it, expect } from 'vitest';
import { mask } from '../../../src/core/data-masker';
import { SafeAccess } from '../../../src/safe-access';

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

    describe('AbstractAccessor.masked()', () => {
        it('returns a new accessor with masked data', () => {
            const accessor = SafeAccess.fromJson('{"user":"john","password":"secret"}');
            const masked = accessor.masked();
            expect(masked.get('user')).toBe('john');
            expect(masked.get('password')).toBe('[REDACTED]');
            // original unchanged
            expect(accessor.get('password')).toBe('secret');
        });

        it('accepts custom patterns', () => {
            const accessor = SafeAccess.fromJson('{"my_field":"val","other":"keep"}');
            const masked = accessor.masked(['my_field']);
            expect(masked.get('my_field')).toBe('[REDACTED]');
            expect(masked.get('other')).toBe('keep');
        });
    });
});
