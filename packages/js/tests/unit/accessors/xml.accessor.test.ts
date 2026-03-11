import { describe, it, expect } from 'vitest';
import { XmlAccessor } from '../../../src/accessors/xml.accessor';
import { InvalidFormatError } from '../../../src/exceptions/invalid-format.error';

describe('XmlAccessor', () => {
  const xml = `<root><user><name>Ana</name><age>30</age></user><title>Test</title></root>`;

  it('from — valid XML string', () => {
    const accessor = XmlAccessor.from(xml);
    expect(accessor).toBeInstanceOf(XmlAccessor);
  });

  it('from — invalid type throws', () => {
    expect(() => XmlAccessor.from(123)).toThrow(InvalidFormatError);
  });

  it('from — invalid XML throws', () => {
    expect(() => XmlAccessor.from('not xml at all <>')).toThrow(InvalidFormatError);
  });

  it('get — simple key', () => {
    const accessor = XmlAccessor.from(xml);
    expect(accessor.get('title')).toBe('Test');
  });

  it('get — nested', () => {
    const accessor = XmlAccessor.from(xml);
    expect(accessor.get('user.name')).toBe('Ana');
    expect(accessor.get('user.age')).toBe('30');
  });

  it('get — nonexistent returns default', () => {
    const accessor = XmlAccessor.from(xml);
    expect(accessor.get('missing.path', 'fallback')).toBe('fallback');
  });

  it('has — existing', () => {
    const accessor = XmlAccessor.from(xml);
    expect(accessor.has('user.name')).toBe(true);
  });

  it('has — nonexistent', () => {
    const accessor = XmlAccessor.from(xml);
    expect(accessor.has('nope')).toBe(false);
  });

  it('set — immutable', () => {
    const accessor = XmlAccessor.from(xml);
    const newAccessor = accessor.set('title', 'New');
    expect(newAccessor.get('title')).toBe('New');
    expect(accessor.get('title')).toBe('Test');
  });

  it('remove — existing', () => {
    const accessor = XmlAccessor.from(xml);
    const newAccessor = accessor.remove('title');
    expect(newAccessor.has('title')).toBe(false);
  });

  it('toArray', () => {
    const accessor = XmlAccessor.from(xml);
    const arr = accessor.toArray();
    expect(arr).toHaveProperty('user');
    expect(arr).toHaveProperty('title');
  });

  it('toJson', () => {
    const accessor = XmlAccessor.from(xml);
    const json = accessor.toJson();
    expect(() => JSON.parse(json)).not.toThrow();
  });

  it('getOriginalXml returns original', () => {
    const accessor = XmlAccessor.from(xml);
    expect(accessor.getOriginalXml()).toBe(xml);
  });

  it('type', () => {
    const accessor = XmlAccessor.from(xml);
    expect(accessor.type('user')).toBe('object');
    expect(accessor.type('title')).toBe('string');
  });

  it('count and keys', () => {
    const accessor = XmlAccessor.from(xml);
    expect(accessor.count()).toBe(2); // user, title
    expect(accessor.keys()).toContain('user');
    expect(accessor.keys()).toContain('title');
  });

  it('handles repeated tags as arrays', () => {
    const xmlItems = `<root><item>A</item><item>B</item><item>C</item></root>`;
    const accessor = XmlAccessor.from(xmlItems);
    const items = accessor.get('item');
    expect(items).toEqual(['A', 'B', 'C']);
  });
});
