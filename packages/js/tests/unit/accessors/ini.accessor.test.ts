import { describe, it, expect } from 'vitest';
import { IniAccessor } from '../../../src/accessors/ini.accessor';
import { InvalidFormatError } from '../../../src/exceptions/invalid-format.error';

describe(IniAccessor.name, () => {
    const ini = `
app_name = MyApp
debug = true

[database]
host = localhost
port = 3306
name = "mydb"

[cache]
driver = redis
ttl = 60
`;

    it('from — valid INI string', () => {
        const accessor = IniAccessor.from(ini);
        expect(accessor).toBeInstanceOf(IniAccessor);
    });

    it('from — invalid type throws', () => {
        expect(() => IniAccessor.from(123)).toThrow(InvalidFormatError);
    });

    it('get — top-level key', () => {
        const accessor = IniAccessor.from(ini);
        expect(accessor.get('app_name')).toBe('MyApp');
    });

    it('get — boolean coercion', () => {
        const accessor = IniAccessor.from(ini);
        expect(accessor.get('debug')).toBe(true);
    });

    it('get — section + key', () => {
        const accessor = IniAccessor.from(ini);
        expect(accessor.get('database.host')).toBe('localhost');
        expect(accessor.get('database.port')).toBe(3306);
        expect(accessor.get('database.name')).toBe('mydb');
    });

    it('get — nonexistent returns default', () => {
        const accessor = IniAccessor.from(ini);
        expect(accessor.get('missing.key', 'fallback')).toBe('fallback');
    });

    it('has — existing', () => {
        const accessor = IniAccessor.from(ini);
        expect(accessor.has('database.host')).toBe(true);
        expect(accessor.has('app_name')).toBe(true);
    });

    it('has — nonexistent', () => {
        const accessor = IniAccessor.from(ini);
        expect(accessor.has('database.missing')).toBe(false);
    });

    it('set — immutable', () => {
        const accessor = IniAccessor.from(ini);
        const newAccessor = accessor.set('database.host', '127.0.0.1');
        expect(newAccessor.get('database.host')).toBe('127.0.0.1');
        expect(accessor.get('database.host')).toBe('localhost');
    });

    it('remove — existing', () => {
        const accessor = IniAccessor.from(ini);
        const newAccessor = accessor.remove('cache');
        expect(newAccessor.has('cache')).toBe(false);
    });

    it('toArray', () => {
        const accessor = IniAccessor.from(ini);
        const arr = accessor.toArray();
        expect(arr).toHaveProperty('database');
        expect(arr).toHaveProperty('cache');
    });

    it('toJson', () => {
        const accessor = IniAccessor.from(ini);
        const json = accessor.toJson();
        const parsed = JSON.parse(json);
        expect(parsed.database.host).toBe('localhost');
    });

    it('count and keys', () => {
        const accessor = IniAccessor.from(ini);
        expect(accessor.count()).toBeGreaterThanOrEqual(4); // app_name, debug, database, cache
        expect(accessor.keys()).toContain('database');
        expect(accessor.keys()).toContain('cache');
    });

    it('coerces on/yes to true, off/no/none/empty to false, null to null', () => {
        const data = `on_val = on\nyes_val = yes\noff_val = off\nno_val = no\nnone_val = none\nempty_val = \nnull_val = null`;
        const accessor = IniAccessor.from(data);
        expect(accessor.get('on_val')).toBe(true);
        expect(accessor.get('yes_val')).toBe(true);
        expect(accessor.get('off_val')).toBe(false);
        expect(accessor.get('no_val')).toBe(false);
        expect(accessor.get('none_val')).toBe(false);
        expect(accessor.get('empty_val')).toBe(false);
        expect(accessor.get('null_val')).toBeNull();
    });

    it('coerces float values', () => {
        const accessor = IniAccessor.from('pi = 3.14');
        expect(accessor.get('pi')).toBe(3.14);
    });

    it('handles single-quoted values', () => {
        const accessor = IniAccessor.from("val = 'hello'");
        expect(accessor.get('val')).toBe('hello');
    });

    it('skips comment lines with #', () => {
        const accessor = IniAccessor.from('# comment line\nkey = value');
        expect(accessor.get('key')).toBe('value');
        expect(accessor.has('#')).toBe(false);
    });

    it('skips lines without = sign', () => {
        const accessor = IniAccessor.from('invalid line\nkey = value');
        expect(accessor.get('key')).toBe('value');
    });

    it('handles keys outside sections', () => {
        const accessor = IniAccessor.from('global_key = global_val\n[section]\nkey = val');
        expect(accessor.get('global_key')).toBe('global_val');
        expect(accessor.get('section.key')).toBe('val');
    });

    it('merges duplicate section headers', () => {
        const accessor = IniAccessor.from('[section]\nkey1 = val1\n[section]\nkey2 = val2');
        expect(accessor.get('section.key1')).toBe('val1');
        expect(accessor.get('section.key2')).toBe('val2');
    });

    it('coerces false specifically', () => {
        const accessor = IniAccessor.from('flag = false');
        expect(accessor.get('flag')).toBe(false);
    });

    it('coerces negative integer values', () => {
        const accessor = IniAccessor.from('offset = -42');
        expect(accessor.get('offset')).toBe(-42);
    });

    it('coerces negative float values', () => {
        const accessor = IniAccessor.from('temp = -3.14');
        expect(accessor.get('temp')).toBe(-3.14);
    });

    it('skips semicolon comment lines', () => {
        const accessor = IniAccessor.from('; comment line\nkey = value');
        expect(accessor.get('key')).toBe('value');
    });

    // ── Quote-stripping boundary (L52-53 LogicalOperator: && → ||) ────────────────

    it('does NOT strip value that only starts with double-quote (no matching end)', () => {
        // Kills LogicalOperator mutant: startsWith('"') && endsWith('"') → startsWith || endsWith
        // With mutant (||): '"hello' starts with '"' → stripped to 'hell'
        // With original (&&): '"hello' does NOT end with '"' → preserved as-is
        const accessor = IniAccessor.from('key = "hello');
        expect(accessor.get('key')).toBe('"hello');
    });

    it('does NOT strip value that only ends with double-quote (no matching start)', () => {
        const accessor = IniAccessor.from('key = hello"');
        expect(accessor.get('key')).toBe('hello"');
    });

    it('does NOT strip value that only starts with single-quote (no matching end)', () => {
        const accessor = IniAccessor.from("key = 'hello");
        expect(accessor.get('key')).toBe("'hello");
    });

    it('does NOT strip value that only ends with single-quote (no matching start)', () => {
        const accessor = IniAccessor.from("key = hello'");
        expect(accessor.get('key')).toBe("hello'");
    });

    it('strips value with matching double quotes (baseline)', () => {
        const accessor = IniAccessor.from('key = "hello"');
        expect(accessor.get('key')).toBe('hello');
    });

    it('strips value with matching single quotes (baseline)', () => {
        const accessor = IniAccessor.from("key = 'hello'");
        expect(accessor.get('key')).toBe('hello');
    });

    // ── toIni serialization ────────────────────────────────────────────────────

    it('toIni — serializes flat keys without section header', () => {
        const accessor = IniAccessor.from('key = value\nnum = 42');
        const ini = accessor.toIni();
        expect(ini).toContain('key = value');
        expect(ini).toContain('num = 42');
    });

    it('toIni — serializes nested object as [section]', () => {
        const accessor = IniAccessor.from('[db]\nhost = localhost\nport = 3306');
        const ini = accessor.toIni();
        expect(ini).toContain('[db]');
        expect(ini).toContain('host = localhost');
        expect(ini).toContain('port = 3306');
    });

    it('toIni — round-trip: toIni → from → all() deep-equals original', () => {
        const original = IniAccessor.from(
            'app = MyApp\ndebug = true\n[db]\nhost = localhost\nport = 3306',
        );
        const roundTripped = IniAccessor.from(original.toIni());
        expect(roundTripped.all()).toEqual(original.all());
    });

    it('toIni — quotes values containing = character', () => {
        const accessor = IniAccessor.from('key = value').set('expr', 'a=b');
        const ini = accessor.toIni();
        expect(ini).toContain('expr = "a=b"');
    });

    it('toIni — quotes values containing ; character', () => {
        const accessor = IniAccessor.from('key = value').set('comment', 'end;here');
        const ini = accessor.toIni();
        expect(ini).toContain('comment = "end;here"');
    });

    it('toIni — serializes boolean true as literal true', () => {
        const accessor = IniAccessor.from('flag = true');
        const ini = accessor.toIni();
        expect(ini).toContain('flag = true');
    });

    it('toIni — serializes boolean false as literal false', () => {
        const accessor = IniAccessor.from('flag = false');
        const ini = accessor.toIni();
        expect(ini).toContain('flag = false');
    });

    it('toIni — serializes null as literal null', () => {
        const accessor = IniAccessor.from('key = value').set('nul', null);
        const ini = accessor.toIni();
        expect(ini).toContain('nul = null');
    });
});
