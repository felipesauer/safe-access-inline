import { describe, it, expect } from 'vitest';
import { JsonAccessor } from '../../../src/accessors/json.accessor';
import { InvalidFormatError } from '../../../src/exceptions/invalid-format.error';

describe('JsonAccessor', () => {
  it('from — valid JSON string', () => {
    const accessor = JsonAccessor.from('{"name": "Ana"}');
    expect(accessor).toBeInstanceOf(JsonAccessor);
  });

  it('from — invalid type throws', () => {
    expect(() => JsonAccessor.from(123)).toThrow(InvalidFormatError);
  });

  it('from — invalid JSON throws', () => {
    expect(() => JsonAccessor.from('{invalid json}')).toThrow(InvalidFormatError);
  });

  it('get — simple key', () => {
    const accessor = JsonAccessor.from('{"name": "Ana", "age": 30}');
    expect(accessor.get('name')).toBe('Ana');
    expect(accessor.get('age')).toBe(30);
  });

  it('get — nested', () => {
    const accessor = JsonAccessor.from('{"user": {"profile": {"name": "Ana"}}}');
    expect(accessor.get('user.profile.name')).toBe('Ana');
  });

  it('get — nonexistent returns default', () => {
    const accessor = JsonAccessor.from('{"a": 1}');
    expect(accessor.get('x.y', 'fallback')).toBe('fallback');
  });

  it('get — numeric index', () => {
    const accessor = JsonAccessor.from('{"items": [{"title": "A"}, {"title": "B"}]}');
    expect(accessor.get('items.0.title')).toBe('A');
    expect(accessor.get('items.1.title')).toBe('B');
  });

  it('get — wildcard', () => {
    const accessor = JsonAccessor.from('{"users": [{"name": "Ana"}, {"name": "Bob"}]}');
    expect(accessor.get('users.*.name')).toEqual(['Ana', 'Bob']);
  });

  it('has — existing', () => {
    const accessor = JsonAccessor.from('{"key": "value"}');
    expect(accessor.has('key')).toBe(true);
  });

  it('has — nonexistent', () => {
    const accessor = JsonAccessor.from('{"key": "value"}');
    expect(accessor.has('missing')).toBe(false);
  });

  it('set — immutable', () => {
    const accessor = JsonAccessor.from('{"name": "old"}');
    const newAccessor = accessor.set('name', 'new');
    expect(newAccessor.get('name')).toBe('new');
    expect(accessor.get('name')).toBe('old');
  });

  it('remove — existing', () => {
    const accessor = JsonAccessor.from('{"a": 1, "b": 2}');
    const newAccessor = accessor.remove('b');
    expect(newAccessor.has('b')).toBe(false);
  });

  it('toArray', () => {
    const accessor = JsonAccessor.from('{"name": "Ana"}');
    expect(accessor.toArray()).toEqual({ name: 'Ana' });
  });

  it('toJson', () => {
    const accessor = JsonAccessor.from('{"name": "Ana"}');
    expect(JSON.parse(accessor.toJson())).toEqual({ name: 'Ana' });
  });

  it('toObject', () => {
    const accessor = JsonAccessor.from('{"name": "Ana"}');
    expect(accessor.toObject()).toEqual({ name: 'Ana' });
  });

  it('type', () => {
    const accessor = JsonAccessor.from('{"s": "str", "n": 42, "b": true, "a": [1]}');
    expect(accessor.type('s')).toBe('string');
    expect(accessor.type('n')).toBe('number');
    expect(accessor.type('b')).toBe('boolean');
    expect(accessor.type('a')).toBe('array');
    expect(accessor.type('missing')).toBeNull();
  });

  it('count and keys', () => {
    const accessor = JsonAccessor.from('{"a": 1, "b": 2, "c": 3}');
    expect(accessor.count()).toBe(3);
    expect(accessor.keys()).toEqual(['a', 'b', 'c']);
  });
});
