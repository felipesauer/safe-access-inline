import { describe, it, expect } from 'vitest';
import { YamlAccessor } from '../../../src/accessors/yaml.accessor';
import { InvalidFormatError } from '../../../src/exceptions/invalid-format.error';

describe('YamlAccessor', () => {
  const yaml = `
app:
  name: MyApp
  version: 2.1
  debug: true

database:
  host: localhost
  port: 5432
  credentials:
    user: admin
    pass: secret

features:
  - auth
  - api
  - dashboard
`;

  it('from — valid YAML string', () => {
    const accessor = YamlAccessor.from(yaml);
    expect(accessor).toBeInstanceOf(YamlAccessor);
  });

  it('from — invalid type throws', () => {
    expect(() => YamlAccessor.from(123)).toThrow(InvalidFormatError);
  });

  it('get — nested key', () => {
    const accessor = YamlAccessor.from(yaml);
    expect(accessor.get('app.name')).toBe('MyApp');
    expect(accessor.get('app.version')).toBe(2.1);
    expect(accessor.get('app.debug')).toBe(true);
  });

  it('get — deeply nested', () => {
    const accessor = YamlAccessor.from(yaml);
    expect(accessor.get('database.credentials.user')).toBe('admin');
    expect(accessor.get('database.credentials.pass')).toBe('secret');
  });

  it('get — numeric values', () => {
    const accessor = YamlAccessor.from(yaml);
    expect(accessor.get('database.port')).toBe(5432);
  });

  it('get — array values', () => {
    const accessor = YamlAccessor.from(yaml);
    const features = accessor.get('features');
    expect(features).toEqual(['auth', 'api', 'dashboard']);
  });

  it('get — nonexistent returns default', () => {
    const accessor = YamlAccessor.from(yaml);
    expect(accessor.get('missing.path', 'fallback')).toBe('fallback');
  });

  it('has — existing', () => {
    const accessor = YamlAccessor.from(yaml);
    expect(accessor.has('app.name')).toBe(true);
    expect(accessor.has('database.host')).toBe(true);
  });

  it('has — nonexistent', () => {
    const accessor = YamlAccessor.from(yaml);
    expect(accessor.has('nope')).toBe(false);
  });

  it('set — immutable', () => {
    const accessor = YamlAccessor.from(yaml);
    const newAccessor = accessor.set('app.name', 'NewApp');
    expect(newAccessor.get('app.name')).toBe('NewApp');
    expect(accessor.get('app.name')).toBe('MyApp');
  });

  it('remove — existing', () => {
    const accessor = YamlAccessor.from(yaml);
    const newAccessor = accessor.remove('app.debug');
    expect(newAccessor.has('app.debug')).toBe(false);
    expect(accessor.has('app.debug')).toBe(true);
  });

  it('toArray', () => {
    const accessor = YamlAccessor.from(yaml);
    const arr = accessor.toArray();
    expect(arr).toHaveProperty('app');
    expect(arr).toHaveProperty('database');
  });

  it('toJson', () => {
    const accessor = YamlAccessor.from(yaml);
    const json = accessor.toJson();
    const parsed = JSON.parse(json);
    expect(parsed.app.name).toBe('MyApp');
  });

  it('type', () => {
    const accessor = YamlAccessor.from(yaml);
    expect(accessor.type('app')).toBe('object');
    expect(accessor.type('app.name')).toBe('string');
    expect(accessor.type('app.debug')).toBe('boolean');
    expect(accessor.type('database.port')).toBe('number');
  });

  it('count and keys', () => {
    const accessor = YamlAccessor.from(yaml);
    expect(accessor.count()).toBeGreaterThanOrEqual(3); // app, database, features
    expect(accessor.keys()).toContain('app');
    expect(accessor.keys()).toContain('database');
    expect(accessor.keys()).toContain('features');
  });

  it('handles null values', () => {
    const yamlNull = `key1: null\nkey2: ~\nkey3: value`;
    const accessor = YamlAccessor.from(yamlNull);
    expect(accessor.get('key1')).toBeNull();
    expect(accessor.get('key2')).toBeNull();
    expect(accessor.get('key3')).toBe('value');
  });

  it('handles quoted strings', () => {
    const yamlQuoted = `name: "hello world"\npath: '/usr/local'`;
    const accessor = YamlAccessor.from(yamlQuoted);
    expect(accessor.get('name')).toBe('hello world');
    expect(accessor.get('path')).toBe('/usr/local');
  });
});
