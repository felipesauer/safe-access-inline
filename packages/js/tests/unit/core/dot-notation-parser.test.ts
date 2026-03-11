import { describe, it, expect } from 'vitest';
import { DotNotationParser } from '../../../src/core/dot-notation-parser';

describe('DotNotationParser', () => {
  // ── get() ─────────────────────────────────────────

  it('get — empty path returns default', () => {
    expect(DotNotationParser.get({ a: 1 }, '', 'default')).toBe('default');
  });

  it('get — simple key', () => {
    const data = { name: 'Ana', age: 30 };
    expect(DotNotationParser.get(data, 'name')).toBe('Ana');
    expect(DotNotationParser.get(data, 'age')).toBe(30);
  });

  it('get — nested key', () => {
    const data = { user: { profile: { name: 'Ana' } } };
    expect(DotNotationParser.get(data, 'user.profile.name')).toBe('Ana');
  });

  it('get — nonexistent key returns default', () => {
    expect(DotNotationParser.get({ a: 1 }, 'x.y.z', 'fallback')).toBe('fallback');
  });

  it('get — numeric index', () => {
    const data = { items: [{ title: 'First' }, { title: 'Second' }] };
    expect(DotNotationParser.get(data, 'items.0.title')).toBe('First');
    expect(DotNotationParser.get(data, 'items.1.title')).toBe('Second');
  });

  it('get — bracket notation', () => {
    const data = { matrix: [[1, 2], [3, 4]] };
    expect(DotNotationParser.get(data, 'matrix[0][1]')).toBe(2);
    expect(DotNotationParser.get(data, 'matrix[1][0]')).toBe(3);
  });

  it('get — wildcard returns array of values', () => {
    const data = { users: [{ name: 'Ana' }, { name: 'Bob' }, { name: 'Carlos' }] };
    expect(DotNotationParser.get(data, 'users.*.name')).toEqual(['Ana', 'Bob', 'Carlos']);
  });

  it('get — wildcard at end returns all items', () => {
    const data = { items: ['a', 'b', 'c'] };
    expect(DotNotationParser.get(data, 'items.*')).toEqual(['a', 'b', 'c']);
  });

  it('get — wildcard on non-array returns default', () => {
    const data = { name: 'Ana' };
    expect(DotNotationParser.get(data, 'name.*.x', 'default')).toBe('default');
  });

  it('get — escaped dot treats as literal key', () => {
    const data = { 'config.db': { host: 'localhost' } };
    expect(DotNotationParser.get(data, 'config\\.db.host')).toBe('localhost');
  });

  it('get — null value is returned (not default)', () => {
    const data = { key: null };
    expect(DotNotationParser.get(data, 'key', 'default')).toBeNull();
  });

  it('get — undefined value triggers default', () => {
    const data = {};
    expect(DotNotationParser.get(data, 'missing', 'default')).toBe('default');
  });

  // ── has() ─────────────────────────────────────────

  it('has — existing key', () => {
    expect(DotNotationParser.has({ a: { b: 1 } }, 'a.b')).toBe(true);
  });

  it('has — nonexistent key', () => {
    expect(DotNotationParser.has({ a: 1 }, 'x.y')).toBe(false);
  });

  it('has — existing null value', () => {
    expect(DotNotationParser.has({ key: null }, 'key')).toBe(true);
  });

  // ── set() ─────────────────────────────────────────

  it('set — creates new nested path', () => {
    const result = DotNotationParser.set({}, 'a.b.c', 'value');
    expect(result).toEqual({ a: { b: { c: 'value' } } });
  });

  it('set — overwrites existing value', () => {
    const data = { name: 'old' };
    const result = DotNotationParser.set(data, 'name', 'new');
    expect(result.name).toBe('new');
  });

  it('set — does not mutate original', () => {
    const data = { a: 1 };
    const result = DotNotationParser.set(data, 'b', 2);
    expect(data).toEqual({ a: 1 });
    expect(result).toEqual({ a: 1, b: 2 });
  });

  // ── remove() ──────────────────────────────────────

  it('remove — existing key', () => {
    const data = { a: { b: 1, c: 2 } };
    const result = DotNotationParser.remove(data, 'a.b');
    expect(result).toEqual({ a: { c: 2 } });
  });

  it('remove — nonexistent key returns unchanged', () => {
    const data = { a: 1 };
    const result = DotNotationParser.remove(data, 'x.y.z');
    expect(result).toEqual({ a: 1 });
  });

  it('remove — does not mutate original', () => {
    const data = { a: 1, b: 2 };
    const result = DotNotationParser.remove(data, 'b');
    expect(data).toEqual({ a: 1, b: 2 });
    expect(result).toEqual({ a: 1 });
  });
});
