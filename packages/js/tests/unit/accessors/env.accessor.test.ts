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

    // ── Quote-stripping boundary (L39-40 LogicalOperator: && → ||) ────────────────

    it('does NOT strip value that only starts with double-quote (no matching end)', () => {
        // Kills LogicalOperator mutant: startsWith('"') && endsWith('"') → startsWith || endsWith
        // With mutant (||): '"hello' starts with '"' → stripped to 'hell' (slice(1,-1))
        // With original (&&): '"hello' does NOT end with '"' → preserved as-is
        const accessor = EnvAccessor.from('KEY="hello');
        expect(accessor.get('KEY')).toBe('"hello');
    });

    it('does NOT strip value that only ends with double-quote (no matching start)', () => {
        const accessor = EnvAccessor.from('KEY=hello"');
        expect(accessor.get('KEY')).toBe('hello"');
    });

    it('does NOT strip value that only starts with single-quote (no matching end)', () => {
        const accessor = EnvAccessor.from("KEY='hello");
        expect(accessor.get('KEY')).toBe("'hello");
    });

    it('does NOT strip value that only ends with single-quote (no matching start)', () => {
        const accessor = EnvAccessor.from("KEY=hello'");
        expect(accessor.get('KEY')).toBe("hello'");
    });

    it('strips value with matching double quotes (baseline)', () => {
        const accessor = EnvAccessor.from('KEY="hello"');
        expect(accessor.get('KEY')).toBe('hello');
    });

    it('strips value with matching single quotes (baseline)', () => {
        const accessor = EnvAccessor.from("KEY='hello'");
        expect(accessor.get('KEY')).toBe('hello');
    });

    // ── toEnv serialization ────────────────────────────────────────────────────

    it('toEnv — serializes flat keys as KEY=VALUE', () => {
        const accessor = EnvAccessor.from('APP=MyApp\nPORT=3000');
        const env = accessor.toEnv();
        expect(env).toContain('APP=MyApp');
        expect(env).toContain('PORT=3000');
    });

    it('toEnv — wraps values with spaces in double quotes', () => {
        const accessor = EnvAccessor.from('NAME=John Doe');
        const env = accessor.toEnv();
        expect(env).toContain('NAME="John Doe"');
    });

    it('toEnv — round-trip: toEnv → from → all() deep-equals original', () => {
        const original = EnvAccessor.from('APP=MyApp\nPORT=3000\nDEBUG=false');
        const roundTripped = EnvAccessor.from(original.toEnv());
        expect(roundTripped.all()).toEqual(original.all());
    });

    it('toEnv — skips nested objects silently', () => {
        const accessor = EnvAccessor.from('FLAT=value').set('nested', { key: 'val' } as never);
        const env = accessor.toEnv();
        expect(env).toContain('FLAT=value');
        expect(env).not.toContain('nested');
        expect(env).not.toContain('key=val');
    });

    it('toEnv — ends with a trailing newline', () => {
        const accessor = EnvAccessor.from('A=1');
        expect(accessor.toEnv()).toMatch(/\n$/);
    });
});
