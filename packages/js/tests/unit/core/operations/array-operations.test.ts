import { describe, it, expect } from 'vitest';
import { SafeAccess } from '../../../../src/safe-access';
import { InvalidFormatError } from '../../../../src/exceptions/invalid-format.error';

const data = JSON.stringify({
    users: [
        { name: 'Ana', age: 30 },
        { name: 'Bob', age: 25 },
        { name: 'Carlos', age: 30 },
    ],
    tags: ['js', 'ts', 'node'],
    nested: [[1, 2], [3, 4], [5]],
    numbers: [3, 1, 4, 1, 5, 9, 2, 6],
});

describe('Array Operations', () => {
    // ── push / pop / shift / unshift ─────────────

    it('push appends items', () => {
        const acc = SafeAccess.fromJson(data);
        const result = acc.push('tags', 'deno', 'bun');
        expect(result.get('tags')).toEqual(['js', 'ts', 'node', 'deno', 'bun']);
    });

    it('pop removes last element', () => {
        const acc = SafeAccess.fromJson(data);
        const result = acc.pop('tags');
        expect(result.get('tags')).toEqual(['js', 'ts']);
    });

    it('shift removes first element', () => {
        const acc = SafeAccess.fromJson(data);
        const result = acc.shift('tags');
        expect(result.get('tags')).toEqual(['ts', 'node']);
    });

    it('unshift prepends items', () => {
        const acc = SafeAccess.fromJson(data);
        const result = acc.unshift('tags', 'deno', 'bun');
        expect(result.get('tags')).toEqual(['deno', 'bun', 'js', 'ts', 'node']);
    });

    // ── insert ─────────────────────────────────────

    it('insert at positive index', () => {
        const acc = SafeAccess.fromJson(data);
        const result = acc.insert('tags', 1, 'deno');
        expect(result.get('tags')).toEqual(['js', 'deno', 'ts', 'node']);
    });

    it('insert at negative index', () => {
        const acc = SafeAccess.fromJson(data);
        const result = acc.insert('tags', -1, 'deno');
        expect(result.get('tags')).toEqual(['js', 'ts', 'deno', 'node']);
    });

    // ── filterAt ───────────────────────────────────

    it('filterAt filters array elements', () => {
        const acc = SafeAccess.fromJson(data);
        const result = acc.filterAt(
            'users',
            (u: unknown) => (u as Record<string, unknown>).age === 30,
        );
        const users = result.get('users') as Record<string, unknown>[];
        expect(users).toHaveLength(2);
        expect(users[0]).toMatchObject({ name: 'Ana' });
        expect(users[1]).toMatchObject({ name: 'Carlos' });
    });

    // ── mapAt ──────────────────────────────────────

    it('mapAt transforms array elements', () => {
        const acc = SafeAccess.fromJson(data);
        const result = acc.mapAt('tags', (t: unknown) => (t as string).toUpperCase());
        expect(result.get('tags')).toEqual(['JS', 'TS', 'NODE']);
    });

    // ── sortAt ─────────────────────────────────────

    it('sortAt sorts primitives ascending', () => {
        const acc = SafeAccess.fromJson(data);
        const result = acc.sortAt('numbers');
        expect(result.get('numbers')).toEqual([1, 1, 2, 3, 4, 5, 6, 9]);
    });

    it('sortAt sorts primitives descending', () => {
        const acc = SafeAccess.fromJson(data);
        const result = acc.sortAt('numbers', undefined, 'desc');
        expect(result.get('numbers')).toEqual([9, 6, 5, 4, 3, 2, 1, 1]);
    });

    it('sortAt sorts by key', () => {
        const acc = SafeAccess.fromJson(data);
        const result = acc.sortAt('users', 'name');
        const users = result.get('users') as Record<string, unknown>[];
        expect(users.map((u) => u.name)).toEqual(['Ana', 'Bob', 'Carlos']);
    });

    it('sortAt sorts by key descending', () => {
        const acc = SafeAccess.fromJson(data);
        const result = acc.sortAt('users', 'age', 'desc');
        const users = result.get('users') as Record<string, unknown>[];
        expect(users[0]).toMatchObject({ name: 'Ana', age: 30 });
    });

    // ── unique ─────────────────────────────────────

    it('unique removes duplicate primitives', () => {
        const acc = SafeAccess.fromJson(data);
        const result = acc.unique('numbers');
        expect(result.get('numbers')).toEqual([3, 1, 4, 5, 9, 2, 6]);
    });

    it('unique removes duplicates by key', () => {
        const acc = SafeAccess.fromJson(data);
        const result = acc.unique('users', 'age');
        const users = result.get('users') as Record<string, unknown>[];
        expect(users).toHaveLength(2);
    });

    // ── flatten ────────────────────────────────────

    it('flatten by default depth 1', () => {
        const acc = SafeAccess.fromJson(data);
        const result = acc.flatten('nested');
        expect(result.get('nested')).toEqual([1, 2, 3, 4, 5]);
    });

    // ── first / last / nth ─────────────────────────

    it('first returns first element', () => {
        const acc = SafeAccess.fromJson(data);
        expect(acc.first('tags')).toBe('js');
    });

    it('first returns default for empty path', () => {
        const acc = SafeAccess.fromJson('{"empty":[]}');
        expect(acc.first('empty', 'fallback')).toBe('fallback');
    });

    it('last returns last element', () => {
        const acc = SafeAccess.fromJson(data);
        expect(acc.last('tags')).toBe('node');
    });

    it('nth returns element at index', () => {
        const acc = SafeAccess.fromJson(data);
        expect(acc.nth('tags', 1)).toBe('ts');
    });

    it('nth supports negative index', () => {
        const acc = SafeAccess.fromJson(data);
        expect(acc.nth('tags', -1)).toBe('node');
    });

    it('nth returns default for out-of-range', () => {
        const acc = SafeAccess.fromJson(data);
        expect(acc.nth('tags', 99, 'none')).toBe('none');
    });

    // ── immutability ───────────────────────────────

    it('all operations are immutable', () => {
        const acc = SafeAccess.fromJson(data);
        const original = acc.get('tags');
        acc.push('tags', 'new');
        expect(acc.get('tags')).toEqual(original);
    });

    // ── error cases ────────────────────────────────

    it('throws on non-array path', () => {
        const acc = SafeAccess.fromJson(data);
        expect(() => acc.push('users.0.name', 'item')).toThrow(InvalidFormatError);
    });
});
