import { describe, it, expect } from 'vitest';
import { DotNotationParser } from '../../../../src/core/parsers/dot-notation-parser';

/**
 * Tests for PathResolver behaviours exercised via DotNotationParser.get().
 *
 * PathResolver is an internal engine — all observable behaviour flows through
 * DotNotationParser, so tests are written at that boundary.
 *
 * Focus areas:
 *  - SLICE (step sign, start/end clamping, boundary indices)
 *  - FILTER (null items in array)
 *  - WILDCARD on plain objects (toIterable object-branch)
 *  - MULTI_INDEX numeric and named
 *  - DESCENT (..key) traversal
 *  - KEY resolution when intermediate is null
 */
describe('PathResolver', () => {
    // ── SLICE ─────────────────────────────────────────────────────────────────

    it('slice — forward step returns range [start:end]', () => {
        const data = { items: [0, 1, 2, 3, 4] };
        expect(DotNotationParser.get(data, 'items[1:3]')).toEqual([1, 2]);
    });

    it('slice — start:end exclusive upper boundary (exactly end not included)', () => {
        const data = { items: [10, 20, 30, 40, 50] };
        expect(DotNotationParser.get(data, 'items[0:5]')).toEqual([10, 20, 30, 40, 50]);
        expect(DotNotationParser.get(data, 'items[0:4]')).toEqual([10, 20, 30, 40]);
    });

    it('slice — step 2 skips elements', () => {
        const data = { items: [0, 1, 2, 3, 4, 5] };
        expect(DotNotationParser.get(data, 'items[::2]')).toEqual([0, 2, 4]);
    });

    it('slice — negative step reverses array (step=-1)', () => {
        const data = { arr: [1, 2, 3, 4, 5] };
        expect(DotNotationParser.get(data, 'arr[::-1]')).toEqual([5, 4, 3, 2, 1]);
    });

    it('slice — negative step with explicit start reverses from that index', () => {
        const data = { arr: [1, 2, 3, 4, 5] };
        // From index 3 down to beginning (exclusive 0), step -1 → [4, 3, 2]
        expect(DotNotationParser.get(data, 'arr[3:0:-1]')).toEqual([4, 3, 2]);
    });

    it('slice — start beyond array length returns empty array', () => {
        const data = { arr: [1, 2, 3] };
        expect(DotNotationParser.get(data, 'arr[10:]')).toEqual([]);
    });

    it('slice — start equal to array length returns empty array', () => {
        const data = { arr: [1, 2, 3] };
        // start=3, len=3 → clamped to 3, end defaults to 3 → empty
        expect(DotNotationParser.get(data, 'arr[3:]')).toEqual([]);
    });

    it('slice — end equal to array length includes last element', () => {
        const data = { arr: [1, 2, 3] };
        expect(DotNotationParser.get(data, 'arr[0:3]')).toEqual([1, 2, 3]);
    });

    it('slice — end beyond array length is clamped to len', () => {
        const data = { arr: [1, 2, 3] };
        expect(DotNotationParser.get(data, 'arr[0:100]')).toEqual([1, 2, 3]);
    });

    it('slice — negative start is resolved relative to end of array', () => {
        const data = { arr: [1, 2, 3, 4, 5] };
        expect(DotNotationParser.get(data, 'arr[-2:]')).toEqual([4, 5]);
    });

    it('slice — negative end is resolved relative to end of array', () => {
        const data = { arr: [1, 2, 3, 4, 5] };
        expect(DotNotationParser.get(data, 'arr[:-2]')).toEqual([1, 2, 3]);
    });

    it('slice — empty slice [0:0] returns empty array', () => {
        const data = { arr: [1, 2, 3] };
        expect(DotNotationParser.get(data, 'arr[0:0]')).toEqual([]);
    });

    it('slice — chained: slice then key', () => {
        const data = { users: [{ name: 'Alice' }, { name: 'Bob' }, { name: 'Carol' }] };
        expect(DotNotationParser.get(data, 'users[0:2].name')).toEqual(['Alice', 'Bob']);
    });

    // ── FILTER ────────────────────────────────────────────────────────────────

    it('filter — null element in array is excluded (not passed to FilterParser.evaluate)', () => {
        const data = {
            items: [{ active: true }, null, { active: false }, { active: true }],
        };
        const result = DotNotationParser.get(data, 'items[?active==true]');
        expect(result).toEqual([{ active: true }, { active: true }]);
        // null item must not appear in the result
        expect(result).not.toContain(null);
    });

    it('filter — non-object primitive in array is excluded', () => {
        const data = { items: [{ v: 1 }, 'string', 42, { v: 2 }] };
        const result = DotNotationParser.get(data, 'items[?v==1]');
        expect(result).toEqual([{ v: 1 }]);
    });

    it('filter — terminal filter returns matches directly', () => {
        const data = {
            products: [
                { name: 'A', price: 10 },
                { name: 'B', price: 50 },
            ],
        };
        expect(DotNotationParser.get(data, 'products[?price>20]')).toEqual([
            { name: 'B', price: 50 },
        ]);
    });

    it('filter — chained: filter then key', () => {
        const data = {
            items: [
                { status: 'active', label: 'X' },
                { status: 'inactive', label: 'Y' },
                { status: 'active', label: 'Z' },
            ],
        };
        expect(DotNotationParser.get(data, "items[?status=='active'].label")).toEqual(['X', 'Z']);
    });

    // ── WILDCARD ──────────────────────────────────────────────────────────────

    it('wildcard — on plain object returns values (tests toIterable object-branch)', () => {
        const data = { sections: { a: { val: 1 }, b: { val: 2 } } };
        const result = DotNotationParser.get(data, 'sections.*.val') as number[];
        expect(result.sort()).toEqual([1, 2]);
    });

    it('wildcard — terminal on plain object returns all values', () => {
        const data = { map: { x: 10, y: 20, z: 30 } };
        expect((DotNotationParser.get(data, 'map.*') as number[]).sort()).toEqual([10, 20, 30]);
    });

    it('wildcard — on non-iterable primitive returns default', () => {
        const data = { val: 42 };
        expect(DotNotationParser.get(data, 'val.*', null)).toBeNull();
    });

    // ── MULTI_INDEX ───────────────────────────────────────────────────────────

    it('multi-index — picks numeric indices from array', () => {
        const data = { arr: [10, 20, 30, 40, 50] };
        expect(DotNotationParser.get(data, 'arr[0,2,4]')).toEqual([10, 30, 50]);
    });

    it('multi-index — named keys from object', () => {
        const data = { cfg: { a: 1, b: 2, c: 3 } };
        expect(DotNotationParser.get(data, "cfg['a','c']")).toEqual([1, 3]);
    });

    it('multi-index — negative numeric index', () => {
        const data = { arr: [10, 20, 30] };
        expect(DotNotationParser.get(data, 'arr[-1,-3]')).toEqual([30, 10]);
    });

    it('multi-index — on null target returns the default value (not an array)', () => {
        // When the target is non-iterable (null), the path returns the default value directly.
        // This covers the PathResolver.toIterable null guard.
        const data = { val: null };
        expect(DotNotationParser.get(data, 'val[0,1]', 'fb')).toBe('fb');
    });

    // ── DESCENT ───────────────────────────────────────────────────────────────

    it('descent — collects key from all levels of a nested object', () => {
        const data = {
            a: { name: 'root', child: { name: 'leaf' } },
        };
        const result = DotNotationParser.get(data, '..name') as string[];
        expect(result).toContain('root');
        expect(result).toContain('leaf');
    });

    it('descent — does not recurse into null values (collectDescent guard)', () => {
        const data = {
            a: null,
            b: { name: 'found' },
        };
        expect(() => DotNotationParser.get(data, '..name')).not.toThrow();
        const result = DotNotationParser.get(data, '..name') as string[];
        expect(result).toContain('found');
    });

    it('descent — primitive child is not traversed (typeof child === object guard)', () => {
        const data = { a: { x: 42 }, b: 'not-an-object' };
        expect(() => DotNotationParser.get(data, '..x')).not.toThrow();
        const result = DotNotationParser.get(data, '..x');
        expect(result).toEqual([42]);
    });

    // ── KEY resolution ────────────────────────────────────────────────────────

    it('key — returns defaultValue when intermediate is null', () => {
        const data = { a: null };
        expect(DotNotationParser.get(data, 'a.b.c', 'miss')).toBe('miss');
    });

    it('key — returns defaultValue when segment.value is not in current', () => {
        const data = { a: { b: 1 } };
        expect(DotNotationParser.get(data, 'a.x', 'miss')).toBe('miss');
    });

    // ── PROJECTION ───────────────────────────────────────────────────────────

    it('projection — on an array projects each item to alias fields', () => {
        const data = {
            items: [
                { name: 'Ana', price: 10 },
                { name: 'Bob', price: 20 },
            ],
        };
        const result = DotNotationParser.get(data, 'items.{name,price}');
        expect(result).toEqual([
            { name: 'Ana', price: 10 },
            { name: 'Bob', price: 20 },
        ]);
    });

    it('projection — non-object items in array produce null alias values (line 146)', () => {
        // Each item is a primitive — the reduce fallback fills alias → null
        const data = { items: [1, 2, 3] };
        const result = DotNotationParser.get(data, 'items.{name}') as unknown[];
        expect(result).toEqual([{ name: null }, { name: null }, { name: null }]);
    });

    it('projection — chained: array projection then key access (lines 161-164)', () => {
        // items.{name} projects to [{name:'Ana'},{name:'Bob'}], then .name resolves on each
        const data = { items: [{ name: 'Ana' }, { name: 'Bob' }] };
        const result = DotNotationParser.get(data, 'items.{name}.name');
        expect(result).toEqual(['Ana', 'Bob']);
    });

    it('projection — chained: object projection then key access (line 171)', () => {
        // product.{title} projects to {title:'Widget'}, then .title resolves on the projected object
        const data = { product: { title: 'Widget' } };
        const result = DotNotationParser.get(data, 'product.{title}.title');
        expect(result).toBe('Widget');
    });
});
