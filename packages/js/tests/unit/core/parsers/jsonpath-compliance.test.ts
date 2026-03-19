import { describe, it, expect, beforeEach } from 'vitest';
import { DotNotationParser } from '../../../../src/core/parsers/dot-notation-parser';
import { PathCache } from '../../../../src/core/resolvers/path-cache';

describe('JSONPath RFC 9535 Compliance', () => {
    const data = {
        store: {
            books: [
                { title: 'A', author: 'Ana', price: 10, tags: ['fiction'] },
                { title: 'B', author: 'Bob', price: 20, tags: ['science', 'tech'] },
                { title: 'C', author: 'Carol', price: 30, tags: ['fiction', 'drama'] },
                { title: 'D', author: 'Dave', price: 40, tags: ['history'] },
                { title: 'E', author: 'Eve', price: 50, tags: ['science'] },
            ],
            name: 'MyStore',
            meta: { open: true, rating: 4.5 },
        },
        users: [
            { name: 'Alice', age: 25, profile: { bio: 'Hi' } },
            { name: 'Bob', age: 17, profile: { bio: 'Hello world' } },
            { name: 'Carol', age: 30, profile: { bio: 'Hey' } },
        ],
    };

    beforeEach(() => PathCache.clear());

    describe('Root anchor ($)', () => {
        it('strips leading $ and resolves path', () => {
            expect(DotNotationParser.get(data, '$.store.name')).toBe('MyStore');
        });

        it('works with bracket notation after $', () => {
            expect(DotNotationParser.get(data, "$['store'].name")).toBe('MyStore');
        });

        it('$ alone with dot path', () => {
            expect(DotNotationParser.get(data, '$.store.meta.open')).toBe(true);
        });
    });

    describe('Bracket notation', () => {
        it("['key'] resolves single-quoted key", () => {
            expect(DotNotationParser.get(data, "store['name']")).toBe('MyStore');
        });

        it('["key"] resolves double-quoted key', () => {
            expect(DotNotationParser.get(data, 'store["name"]')).toBe('MyStore');
        });

        it('supports keys with special characters', () => {
            const specialData = { 'key-with-dash': 42, 'key.with.dot': 99 };
            expect(DotNotationParser.get(specialData, "['key-with-dash']")).toBe(42);
            expect(DotNotationParser.get(specialData, "['key.with.dot']")).toBe(99);
        });
    });

    describe('Multi-index [0,1,2]', () => {
        it('returns elements at specified indices', () => {
            const result = DotNotationParser.get(data, 'store.books[0,2,4]');
            expect(result).toEqual([data.store.books[0], data.store.books[2], data.store.books[4]]);
        });

        it('returns selected elements with chained path', () => {
            const result = DotNotationParser.get(data, 'store.books[0,1].title');
            expect(result).toEqual(['A', 'B']);
        });

        it('handles out-of-bounds gracefully', () => {
            const result = DotNotationParser.get(data, 'store.books[0,99]');
            expect(result).toEqual([data.store.books[0], null]);
        });

        it('returns default on non-iterable', () => {
            expect(DotNotationParser.get(data, 'store.name[0,1]')).toBeNull();
        });

        it('supports negative indices', () => {
            const result = DotNotationParser.get(data, 'store.books[-1,-2]');
            expect(result).toEqual([data.store.books[4], data.store.books[3]]);
        });
    });

    describe('Multi-key bracket notation', () => {
        it('picks named keys from object', () => {
            const result = DotNotationParser.get(data, "store.meta['open','rating']");
            expect(result).toEqual([true, 4.5]);
        });

        it('returns default value on non-object', () => {
            expect(DotNotationParser.get(data, "store.name['a','b']")).toBeNull();
        });

        it('returns default for missing keys', () => {
            const result = DotNotationParser.get(data, "store.meta['open','missing']");
            expect(result).toEqual([true, null]);
        });

        it('multi-key with chained path', () => {
            const obj = { a: { x: 1 }, b: { x: 2 }, c: { x: 3 } };
            const result = DotNotationParser.get(obj, "['a','b'].x");
            expect(result).toEqual([1, 2]);
        });
    });

    describe('Slice [start:end:step]', () => {
        it('[0:3] returns first 3 elements', () => {
            const result = DotNotationParser.get(data, 'store.books[0:3]');
            expect(result).toEqual(data.store.books.slice(0, 3));
        });

        it('[::2] returns every other element', () => {
            const result = DotNotationParser.get(data, 'store.books[::2]');
            expect(result).toEqual([data.store.books[0], data.store.books[2], data.store.books[4]]);
        });

        it('[1:4] returns elements 1-3', () => {
            const result = DotNotationParser.get(data, 'store.books[1:4]');
            expect(result).toEqual(data.store.books.slice(1, 4));
        });

        it('[1:10:2] returns every other starting at index 1', () => {
            const result = DotNotationParser.get(data, 'store.books[1:10:2]');
            expect(result).toEqual([data.store.books[1], data.store.books[3]]);
        });

        it('[-2:] returns last 2 elements', () => {
            const result = DotNotationParser.get(data, 'store.books[-2:]');
            expect(result).toEqual(data.store.books.slice(-2));
        });

        it('slice with chained path', () => {
            const result = DotNotationParser.get(data, 'store.books[0:2].title');
            expect(result).toEqual(['A', 'B']);
        });

        it('returns default on non-iterable', () => {
            expect(DotNotationParser.get(data, 'store.name[0:2]')).toBeNull();
        });

        it('negative step reverses', () => {
            const arr = [1, 2, 3, 4, 5];
            const result = DotNotationParser.get({ items: arr }, 'items[4:1:-1]');
            expect(result).toEqual([5, 4, 3]);
        });

        it('start beyond length returns empty', () => {
            const result = DotNotationParser.get(data, 'store.books[99:100]');
            expect(result).toEqual([]);
        });

        it('negative end with positive step', () => {
            const result = DotNotationParser.get(data, 'store.books[0:-2]');
            expect(result).toEqual(data.store.books.slice(0, -2));
        });
    });

    describe('Filter functions', () => {
        it('length(@.name) > N filters by string length', () => {
            const result = DotNotationParser.get(data, 'users[?length(@.name)>3].name');
            expect(result).toEqual(['Alice', 'Carol']);
        });

        it('length(@.tags) > N filters by array length', () => {
            const result = DotNotationParser.get(data, 'store.books[?length(@.tags)>1].title');
            expect(result).toEqual(['B', 'C']);
        });

        it("match(@.author, 'A.*') filters by regex", () => {
            const result = DotNotationParser.get(data, "store.books[?match(@.author,'A.*')].title");
            expect(result).toEqual(['A']);
        });

        it('keys(@) > N filters by key count', () => {
            const items = {
                a: { x: 1, y: 2, z: 3 },
                b: { x: 1 },
                c: { x: 1, y: 2, z: 3, w: 4 },
            };
            const result = DotNotationParser.get(items, '[?keys(@)>2]');
            expect(result).toEqual([
                { x: 1, y: 2, z: 3 },
                { x: 1, y: 2, z: 3, w: 4 },
            ]);
        });

        it('filter functions work with && logical', () => {
            const result = DotNotationParser.get(
                data,
                'store.books[?length(@.title)==1 && price>15].title',
            );
            expect(result).toEqual(['B', 'C', 'D', 'E']);
        });

        it('match with double-quoted pattern', () => {
            const result = DotNotationParser.get(data, 'store.books[?match(@.author,"B.*")].title');
            expect(result).toEqual(['B']);
        });

        it('match on non-string returns false', () => {
            const result = DotNotationParser.get(data, "store.books[?match(@.price,'.*')].title");
            expect(result).toEqual([]);
        });

        it('keys on non-object returns 0', () => {
            const items = { a: [1, 2], b: { x: 1 } };
            const result = DotNotationParser.get(items, '[?keys(@)>0]');
            expect(result).toEqual([{ x: 1 }]);
        });

        it('length on object counts keys', () => {
            const items = { a: { x: 1, y: 2 }, b: { x: 1 } };
            const result = DotNotationParser.get(items, '[?length(@)>1]');
            expect(result).toEqual([{ x: 1, y: 2 }]);
        });

        it('length on non-string/array/object returns 0', () => {
            const items = {
                a: { val: 42 },
                b: { val: 'hello', extra: true },
            };
            const result = DotNotationParser.get(items, '[?length(@)>1]');
            expect(result).toEqual([{ val: 'hello', extra: true }]);
        });

        it('unknown function throws', () => {
            expect(() =>
                DotNotationParser.get(data, 'store.books[?unknown(@.title)>0].title'),
            ).toThrow('Unknown filter function');
        });
    });

    describe('Combined features', () => {
        it('$ + bracket + filter', () => {
            const result = DotNotationParser.get(data, '$.store.books[?price>25].title');
            expect(result).toEqual(['C', 'D', 'E']);
        });

        it('$ + slice + chained path', () => {
            const result = DotNotationParser.get(data, '$.store.books[0:2].author');
            expect(result).toEqual(['Ana', 'Bob']);
        });

        it('descent still works with new features', () => {
            const result = DotNotationParser.get(data, '..title');
            expect(result).toEqual(['A', 'B', 'C', 'D', 'E']);
        });

        it('existing filter syntax still works', () => {
            const result = DotNotationParser.get(data, 'store.books[?price>=30].title');
            expect(result).toEqual(['C', 'D', 'E']);
        });
    });

    describe('Edge cases', () => {
        it('double-quoted multi-key', () => {
            const result = DotNotationParser.get(data, 'store.meta["open","rating"]');
            expect(result).toEqual([true, 4.5]);
        });

        it('slice with default start/end on negative step', () => {
            const result = DotNotationParser.get({ items: [1, 2, 3, 4, 5] }, 'items[::-1]');
            expect(result).toEqual([5, 4, 3, 2, 1]);
        });

        it('getBySegments returns default for missing key', () => {
            expect(DotNotationParser.getBySegments({ a: 1 }, ['missing'])).toBeNull();
        });

        it('getBySegments returns default for non-object intermediate', () => {
            expect(
                DotNotationParser.getBySegments({ a: 42 } as Record<string, unknown>, ['a', 'b']),
            ).toBeNull();
        });

        it('setBySegments creates intermediate objects', () => {
            const result = DotNotationParser.setBySegments({}, ['a', 'b', 'c'], 42);
            expect(result).toEqual({ a: { b: { c: 42 } } });
        });

        it('removeBySegments returns unchanged if path not found', () => {
            const data = { a: 1 };
            const result = DotNotationParser.removeBySegments(data, ['x', 'y']);
            expect(result).toEqual({ a: 1 });
        });

        it('filter with != operator', () => {
            const result = DotNotationParser.get(data, "store.books[?author!='Ana'].title");
            expect(result).toEqual(['B', 'C', 'D', 'E']);
        });

        it('filter with < operator', () => {
            const result = DotNotationParser.get(data, 'store.books[?price<20].title');
            expect(result).toEqual(['A']);
        });

        it('filter with <= operator', () => {
            const result = DotNotationParser.get(data, 'store.books[?price<=20].title');
            expect(result).toEqual(['A', 'B']);
        });

        it('filter with plain field arg in function', () => {
            const items = [
                { name: 'Alice', nick: 'Ali' },
                { name: 'Bob', nick: 'Bobby' },
            ];
            const result = DotNotationParser.get({ items }, 'items[?length(@.nick)>3].name');
            expect(result).toEqual(['Bob']);
        });

        it('bracket with non-numeric non-quoted comma values falls through to key', () => {
            const obj = { 'abc,def': 42 };
            expect(DotNotationParser.get(obj, '[abc,def]')).toBe(42);
        });
    });

    describe('Recursive descent multi-key', () => {
        it("..['name','age'] collects multiple keys from nested objects", () => {
            const result = DotNotationParser.get(data, "..['name','age']");
            expect(result).toEqual(
                expect.arrayContaining(['MyStore', 'Alice', 'Bob', 'Carol', 25, 17, 30]),
            );
        });

        it("$.store.books..['title','price'] collects from array of objects", () => {
            const result = DotNotationParser.get(data, "$.store.books..['title','price']");
            expect(result).toEqual(
                expect.arrayContaining(['A', 'B', 'C', 'D', 'E', 10, 20, 30, 40, 50]),
            );
            expect(result).toHaveLength(10);
        });

        it("..['name'] with single quoted key in brackets acts as descent", () => {
            const result = DotNotationParser.get(data, "..['name']");
            expect(result).toEqual(expect.arrayContaining(['MyStore', 'Alice', 'Bob', 'Carol']));
        });

        it('returns default when no keys match', () => {
            const result = DotNotationParser.get(
                data,
                "..['nonexistent1','nonexistent2']",
                'fallback',
            );
            expect(result).toBe('fallback');
        });

        it("..['bio'] finds deeply nested keys", () => {
            const result = DotNotationParser.get(data, "..['bio']");
            expect(result).toEqual(expect.arrayContaining(['Hi', 'Hello world', 'Hey']));
        });

        it('..["name","age"] with double-quoted keys collects matched values', () => {
            const result = DotNotationParser.get(data, '..["name","age"]') as unknown[];
            expect(result).toContain('Alice');
        });
    });
});
