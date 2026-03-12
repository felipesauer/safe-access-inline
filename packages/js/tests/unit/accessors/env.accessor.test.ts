import { describe, it, expect } from 'vitest';
import { EnvAccessor } from '../../../src/accessors/env.accessor';
import { InvalidFormatError } from '../../../src/exceptions/invalid-format.error';

describe(EnvAccessor.name, () => {
    const env = `
APP_NAME=MyApp
APP_KEY="secret-key-123"
DEBUG=true
# This is a comment
DB_HOST=localhost
DB_PORT=5432

EMPTY_VAR=
SINGLE_QUOTED='hello world'
`;

    it('from — valid ENV string', () => {
        const accessor = EnvAccessor.from(env);
        expect(accessor).toBeInstanceOf(EnvAccessor);
    });

    it('from — invalid type throws', () => {
        expect(() => EnvAccessor.from(123)).toThrow(InvalidFormatError);
    });

    it('get — simple key', () => {
        const accessor = EnvAccessor.from(env);
        expect(accessor.get('APP_NAME')).toBe('MyApp');
        expect(accessor.get('DB_HOST')).toBe('localhost');
        expect(accessor.get('DB_PORT')).toBe('5432');
    });

    it('get — nonexistent returns default', () => {
        const accessor = EnvAccessor.from(env);
        expect(accessor.get('MISSING', 'fallback')).toBe('fallback');
    });

    it('supports comments', () => {
        const accessor = EnvAccessor.from(env);
        // Comments should not appear as keys
        expect(accessor.has('# This is a comment')).toBe(false);
    });

    it('supports double quoted values', () => {
        const accessor = EnvAccessor.from(env);
        expect(accessor.get('APP_KEY')).toBe('secret-key-123');
    });

    it('supports single quoted values', () => {
        const accessor = EnvAccessor.from(env);
        expect(accessor.get('SINGLE_QUOTED')).toBe('hello world');
    });

    it('ignores blank lines', () => {
        const accessor = EnvAccessor.from(env);
        expect(accessor.count()).toBe(7); // APP_NAME, APP_KEY, DEBUG, DB_HOST, DB_PORT, EMPTY_VAR, SINGLE_QUOTED
    });

    it('has — existing', () => {
        const accessor = EnvAccessor.from(env);
        expect(accessor.has('APP_NAME')).toBe(true);
        expect(accessor.has('DEBUG')).toBe(true);
    });

    it('has — nonexistent', () => {
        const accessor = EnvAccessor.from(env);
        expect(accessor.has('NOPE')).toBe(false);
    });

    it('set — immutable', () => {
        const accessor = EnvAccessor.from(env);
        const newAccessor = accessor.set('APP_NAME', 'NewApp');
        expect(newAccessor.get('APP_NAME')).toBe('NewApp');
        expect(accessor.get('APP_NAME')).toBe('MyApp');
    });

    it('remove — existing', () => {
        const accessor = EnvAccessor.from(env);
        const newAccessor = accessor.remove('DEBUG');
        expect(newAccessor.has('DEBUG')).toBe(false);
        expect(accessor.has('DEBUG')).toBe(true);
    });

    it('count and keys', () => {
        const accessor = EnvAccessor.from(env);
        expect(accessor.keys()).toContain('APP_NAME');
        expect(accessor.keys()).toContain('DB_HOST');
    });

    it('toArray', () => {
        const accessor = EnvAccessor.from(env);
        const arr = accessor.toArray();
        expect(arr.APP_NAME).toBe('MyApp');
    });

    it('toJson', () => {
        const accessor = EnvAccessor.from(env);
        const json = accessor.toJson();
        const parsed = JSON.parse(json);
        expect(parsed.APP_NAME).toBe('MyApp');
    });

    it('skips lines without = sign', () => {
        const accessor = EnvAccessor.from('VALID=value\ninvalid line\nOTHER=data');
        expect(accessor.get('VALID')).toBe('value');
        expect(accessor.get('OTHER')).toBe('data');
        expect(accessor.count()).toBe(2);
    });
});
