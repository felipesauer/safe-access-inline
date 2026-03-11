import { describe, it, expect } from 'vitest';
import { IniAccessor } from '../../../src/accessors/ini.accessor';
import { InvalidFormatError } from '../../../src/exceptions/invalid-format.error';

describe('IniAccessor', () => {
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
});
