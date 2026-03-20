import { describe, it, expect } from 'vitest';
import { diff, applyPatch } from '../../../../src/core/operations/json-patch';
import type { JsonPatchOperation } from '../../../../src/core/operations/json-patch';
import { SafeAccess } from '../../../../src/safe-access';
import { JsonPatchTestFailedError } from '../../../../src/exceptions/json-patch-test-failed.error';

describe('JSON Patch — diff()', () => {
    it('detects added keys', () => {
        const ops = diff({ a: 1 }, { a: 1, b: 2 });
        expect(ops).toEqual([{ op: 'add', path: '/b', value: 2 }]);
    });

    it('detects removed keys', () => {
        const ops = diff({ a: 1, b: 2 }, { a: 1 });
        expect(ops).toEqual([{ op: 'remove', path: '/b' }]);
    });

    it('detects replaced values', () => {
        const ops = diff({ a: 1 }, { a: 2 });
        expect(ops).toEqual([{ op: 'replace', path: '/a', value: 2 }]);
    });

    it('diffs nested objects recursively', () => {
        const a = { user: { name: 'Ana', age: 30 } };
        const b = { user: { name: 'Ana', age: 31 } };
        const ops = diff(a, b);
        expect(ops).toEqual([{ op: 'replace', path: '/user/age', value: 31 }]);
    });

    it('diffs arrays', () => {
        const a = { items: [1, 2, 3] };
        const b = { items: [1, 2, 4] };
        const ops = diff(a, b);
        expect(ops).toContainEqual({ op: 'replace', path: '/items/2', value: 4 });
    });

    it('returns empty array for identical objects', () => {
        const ops = diff({ a: 1, b: { c: 2 } }, { a: 1, b: { c: 2 } });
        expect(ops).toEqual([]);
    });

    it('escapes keys with special characters', () => {
        const ops = diff({}, { 'a/b': 1, 'c~d': 2 });
        expect(ops).toContainEqual({ op: 'add', path: '/a~1b', value: 1 });
        expect(ops).toContainEqual({ op: 'add', path: '/c~0d', value: 2 });
    });

    it('handles deeply nested changes', () => {
        const a = { l1: { l2: { l3: { l4: 'old' } } } };
        const b = { l1: { l2: { l3: { l4: 'new' } } } };
        const ops = diff(a, b);
        expect(ops).toEqual([{ op: 'replace', path: '/l1/l2/l3/l4', value: 'new' }]);
    });
});

describe('JSON Patch — applyPatch()', () => {
    it('applies add operation', () => {
        const result = applyPatch({ a: 1 }, [{ op: 'add', path: '/b', value: 2 }]);
        expect(result).toEqual({ a: 1, b: 2 });
    });

    it('applies remove operation', () => {
        const result = applyPatch({ a: 1, b: 2 }, [{ op: 'remove', path: '/b' }]);
        expect(result).toEqual({ a: 1 });
    });

    it('applies replace operation', () => {
        const result = applyPatch({ a: 1 }, [{ op: 'replace', path: '/a', value: 99 }]);
        expect(result).toEqual({ a: 99 });
    });

    it('applies move operation', () => {
        const result = applyPatch({ a: 1, b: 2 }, [{ op: 'move', from: '/a', path: '/c' }]);
        expect(result).toEqual({ b: 2, c: 1 });
    });

    it('applies copy operation', () => {
        const result = applyPatch({ a: 1 }, [{ op: 'copy', from: '/a', path: '/b' }]);
        expect(result).toEqual({ a: 1, b: 1 });
    });

    it('test operation succeeds for matching value', () => {
        const ops: JsonPatchOperation[] = [{ op: 'test', path: '/a', value: 1 }];
        expect(() => applyPatch({ a: 1 }, ops)).not.toThrow();
    });

    it('test operation fails for non-matching value', () => {
        const ops: JsonPatchOperation[] = [{ op: 'test', path: '/a', value: 999 }];
        expect(() => applyPatch({ a: 1 }, ops)).toThrow('Test operation failed');
    });

    it('test operation throws JsonPatchTestFailedError', () => {
        const ops: JsonPatchOperation[] = [{ op: 'test', path: '/a', value: 999 }];
        try {
            applyPatch({ a: 1 }, ops);
            expect.unreachable('should throw');
        } catch (err) {
            expect(err).toBeInstanceOf(JsonPatchTestFailedError);
            expect(err).toBeInstanceOf(Error);
        }
    });

    it('applies multiple operations sequentially', () => {
        const ops: JsonPatchOperation[] = [
            { op: 'add', path: '/b', value: 2 },
            { op: 'replace', path: '/a', value: 10 },
            { op: 'remove', path: '/b' },
        ];
        const result = applyPatch({ a: 1 }, ops);
        expect(result).toEqual({ a: 10 });
    });

    it('applies nested add', () => {
        const result = applyPatch({ user: {} }, [{ op: 'add', path: '/user/name', value: 'Ana' }]);
        expect(result).toEqual({ user: { name: 'Ana' } });
    });
});

describe('AbstractAccessor.diff() and applyPatch()', () => {
    it('diff — returns patch between two accessors', () => {
        const a = SafeAccess.fromJson('{"name":"Ana","age":30}');
        const b = SafeAccess.fromJson('{"name":"Ana","age":31}');
        const ops = a.diff(b);
        expect(ops).toEqual([{ op: 'replace', path: '/age', value: 31 }]);
    });

    it('applyPatch — applies patch to accessor', () => {
        const acc = SafeAccess.fromJson('{"name":"Ana","age":30}');
        const patched = acc.applyPatch([{ op: 'replace', path: '/age', value: 31 }]);
        expect(patched.get('age')).toBe(31);
        expect(acc.get('age')).toBe(30); // immutable
    });

    it('roundtrip: diff then applyPatch', () => {
        const a = SafeAccess.fromJson('{"a":1,"b":{"c":2}}');
        const b = SafeAccess.fromJson('{"a":1,"b":{"c":3},"d":4}');
        const ops = a.diff(b);
        const result = a.applyPatch(ops);
        expect(result.all()).toEqual(b.all());
    });

    it('applyPatch — throws when move operation is missing from field', () => {
        expect(() =>
            applyPatch({ a: 1 }, [{ op: 'move', path: '/b' } as JsonPatchOperation]),
        ).toThrow("JSON Patch 'move' operation requires a 'from' field");
    });

    it('applyPatch — throws when copy operation is missing from field', () => {
        expect(() =>
            applyPatch({ a: 1 }, [{ op: 'copy', path: '/b' } as JsonPatchOperation]),
        ).toThrow("JSON Patch 'copy' operation requires a 'from' field");
    });
});

// ── JSON Patch — array diffing edge cases ───────────────────────
describe('JSON Patch — array edge cases', () => {
    it('diff detects added array elements', () => {
        const ops = diff({ items: [1] }, { items: [1, 2, 3] });
        expect(ops).toContainEqual({ op: 'add', path: '/items/1', value: 2 });
        expect(ops).toContainEqual({ op: 'add', path: '/items/2', value: 3 });
    });

    it('diff detects removed array elements', () => {
        const ops = diff({ items: [1, 2, 3] }, { items: [1] });
        const removeOps = ops.filter((o) => o.op === 'remove');
        expect(removeOps.length).toBeGreaterThan(0);
    });

    it('diff handles nested object changes inside arrays', () => {
        const a = {
            items: [
                { name: 'a', val: 1 },
                { name: 'b', val: 2 },
            ],
        };
        const b = {
            items: [
                { name: 'a', val: 1 },
                { name: 'b', val: 99 },
            ],
        };
        const ops = diff(a, b);
        expect(ops).toContainEqual({ op: 'replace', path: '/items/1/val', value: 99 });
    });

    it('diff handles array to different type', () => {
        const a = { items: [1, 2] };
        const b = { items: [1, 'two'] };
        const ops = diff(a, b);
        expect(ops).toContainEqual({ op: 'replace', path: '/items/1', value: 'two' });
    });

    it('applyPatch — add to array with - (append)', () => {
        const result = applyPatch({ items: [1, 2] }, [{ op: 'add', path: '/items/-', value: 3 }]);
        expect(result.items).toEqual([1, 2, 3]);
    });

    it('applyPatch — remove from array by index', () => {
        const result = applyPatch({ items: [1, 2, 3] }, [{ op: 'remove', path: '/items/1' }]);
        expect(result.items).toEqual([1, 3]);
    });

    it('applyPatch — replace in array by index', () => {
        const result = applyPatch({ items: [1, 2, 3] }, [
            { op: 'replace', path: '/items/1', value: 99 },
        ]);
        expect(result.items).toEqual([1, 99, 3]);
    });

    it('applyPatch — move within nested', () => {
        const result = applyPatch({ a: { x: 1 }, b: {} }, [
            { op: 'move', from: '/a/x', path: '/b/y' },
        ]);
        expect(result).toEqual({ a: {}, b: { y: 1 } });
    });

    it('applyPatch — copy nested', () => {
        const result = applyPatch({ a: { x: [1, 2] } }, [{ op: 'copy', from: '/a/x', path: '/b' }]);
        expect(result).toEqual({ a: { x: [1, 2] }, b: [1, 2] });
    });

    it('applyPatch — test passes for equal nested objects', () => {
        const ops: JsonPatchOperation[] = [{ op: 'test', path: '/a', value: { x: 1 } }];
        expect(() => applyPatch({ a: { x: 1 } }, ops)).not.toThrow();
    });

    it('applyPatch — test fails for non-equal nested objects', () => {
        const ops: JsonPatchOperation[] = [{ op: 'test', path: '/a', value: { x: 2 } }];
        expect(() => applyPatch({ a: { x: 1 } }, ops)).toThrow('Test operation failed');
    });

    it('diff — null values compared', () => {
        const ops = diff({ a: null } as Record<string, unknown>, { a: 1 });
        expect(ops).toContainEqual({ op: 'replace', path: '/a', value: 1 });
    });

    it('diff — different types at same key', () => {
        const ops = diff(
            { a: 'str' } as Record<string, unknown>,
            { a: [1, 2] } as Record<string, unknown>,
        );
        expect(ops).toContainEqual({ op: 'replace', path: '/a', value: [1, 2] });
    });

    it('diff — array with objects with different keys', () => {
        const a = { items: [{ x: 1 }] };
        const b = { items: [{ x: 1, y: 2 }] };
        const ops = diff(a, b);
        expect(ops).toContainEqual({ op: 'add', path: '/items/0/y', value: 2 });
    });

    it('getAtPointer returns undefined for non-existent path', () => {
        const ops: JsonPatchOperation[] = [{ op: 'copy', from: '/nonexistent', path: '/b' }];
        const result = applyPatch({ a: 1 }, ops);
        expect(result.b).toBeUndefined();
    });

    it('diff — deep equality with arrays of different lengths', () => {
        const a = { a: [1, 2, 3] };
        const b = { a: [1, 2] };
        const ops = diff(a, b);
        expect(ops.some((o) => o.op === 'remove')).toBe(true);
    });

    it('parsePointer handles empty pointer', () => {
        const result = applyPatch({ a: 1 }, [{ op: 'replace', path: '', value: { b: 2 } }]);
        expect(result).toEqual({ b: 2 });
    });

    it('setAtPointer to nested array element', () => {
        const result = applyPatch({ items: [{ a: 1 }, { a: 2 }] }, [
            { op: 'replace', path: '/items/0/a', value: 99 },
        ]);
        expect(result.items).toEqual([{ a: 99 }, { a: 2 }]);
    });

    it('getAtPointer traverses array', () => {
        const ops: JsonPatchOperation[] = [{ op: 'copy', from: '/items/1', path: '/copied' }];
        const result = applyPatch({ items: ['a', 'b', 'c'] }, ops);
        expect(result.copied).toBe('b');
    });

    it('getAtPointer on primitive returns undefined', () => {
        const ops: JsonPatchOperation[] = [{ op: 'copy', from: '/a/deep', path: '/b' }];
        const result = applyPatch({ a: 42 } as Record<string, unknown>, ops);
        expect(result.b).toBeUndefined();
    });

    it('removeAtPointer from array', () => {
        const result = applyPatch({ items: ['a', 'b', 'c'] }, [{ op: 'remove', path: '/items/0' }]);
        expect(result.items).toEqual(['b', 'c']);
    });

    it('removeAtPointer empty pointer returns empty object', () => {
        const result = applyPatch({ a: 1, b: 2 }, [{ op: 'remove', path: '' }]);
        expect(result).toEqual({});
    });

    it('add with undefined value at root falls back to empty object', () => {
        const result = applyPatch({ a: 1 }, [{ op: 'add', path: '', value: undefined }]);
        expect(result).toEqual({});
    });

    it('move to root replaces entire document', () => {
        const result = applyPatch({ a: 1, b: { x: 2 } }, [{ op: 'move', from: '/b', path: '' }]);
        expect(result).toEqual({ x: 2 });
    });

    it('move from root clears document and sets target', () => {
        const result = applyPatch({ a: 1, b: 2 }, [{ op: 'move', from: '', path: '/nested' }]);
        expect(result).toEqual({ nested: { a: 1, b: 2 } });
    });

    it('copy to root replaces entire document', () => {
        const result = applyPatch({ src: { x: 1 }, other: 2 }, [
            { op: 'copy', from: '/src', path: '' },
        ]);
        expect(result).toEqual({ x: 1 });
    });

    it('diff with deeply nested arrays of objects', () => {
        const a = { deep: { arr: [{ id: 1 }, { id: 2 }] } };
        const b = { deep: { arr: [{ id: 1 }, { id: 3 }] } };
        const ops = diff(a, b);
        expect(ops).toContainEqual({ op: 'replace', path: '/deep/arr/1/id', value: 3 });
    });

    it('parsePointer with escaped characters', () => {
        const result = applyPatch({ 'a/b': 1, 'c~d': 2 }, [
            { op: 'replace', path: '/a~1b', value: 99 },
        ]);
        expect(result['a/b']).toBe(99);
    });
});

// ── JsonPatch — pointer edge cases ──────────────────────────────
describe('JsonPatch — pointer edge cases', () => {
    it('throws on invalid JSON Pointer (no leading /)', () => {
        const data = { a: 1 };
        const ops: JsonPatchOperation[] = [{ op: 'replace', path: 'invalid-no-slash', value: 2 }];
        expect(() => applyPatch(data, ops)).toThrow('Invalid JSON Pointer');
    });

    it('setAtPointer traverses through arrays', () => {
        const data = { items: [{ name: 'old' }] };
        const ops: JsonPatchOperation[] = [{ op: 'replace', path: '/items/0/name', value: 'new' }];
        const result = applyPatch(data, ops) as { items: Array<{ name: string }> };
        expect(result.items[0].name).toBe('new');
    });

    it('removeAtPointer traverses through arrays', () => {
        const data = { items: [{ name: 'old', extra: true }] };
        const ops: JsonPatchOperation[] = [{ op: 'remove', path: '/items/0/extra' }];
        const result = applyPatch(data, ops) as { items: Array<Record<string, unknown>> };
        expect(result.items[0]).toEqual({ name: 'old' });
    });
});

// ── JsonPatch — diff: object vs scalar boundary (L43 LogicalOperator) ──────────
describe('JsonPatch — diff object-vs-scalar boundary', () => {
    it('diff generates replace when aVal is object but bVal is primitive', () => {
        // Kills LogicalOperator mutant: isPlainObject(aVal) && → ||
        // With mutant (||): one side is object → recurses into diff(), likely throws or wrong ops
        // With original (&&): one is not an object → emits a single replace op
        const a = { x: { nested: 1 } };
        const b = { x: 42 };
        const ops = diff(a, b);
        expect(ops).toHaveLength(1);
        expect(ops[0]).toEqual({ op: 'replace', path: '/x', value: 42 });
    });

    it('diff generates replace when aVal is primitive but bVal is object', () => {
        const a = { x: 42 };
        const b = { x: { nested: 1 } };
        const ops = diff(a, b);
        expect(ops).toHaveLength(1);
        expect(ops[0]).toEqual({ op: 'replace', path: '/x', value: { nested: 1 } });
    });

    it('diff recurses into nested objects only when BOTH sides are plain objects', () => {
        // Ensures the &&-guarded recursion does generate sub-ops for object-to-object changes
        const a = { x: { y: 1 } };
        const b = { x: { y: 2 } };
        const ops = diff(a, b);
        expect(ops).toHaveLength(1);
        expect(ops[0]).toEqual({ op: 'replace', path: '/x/y', value: 2 });
    });
});

// ── JsonPatch — diff: array removal index ordering (L74) ─────────────────────
describe('JsonPatch — diff array removal index ordering', () => {
    it('diff removes two trailing elements in correct descending index order', () => {
        // a=[0,1,2,3], b=[0,1] → must remove index 3 then 2 (descending) to avoid shifts
        // Kills ArithmeticOperator mutant: a.length - 1 - (i - b.length) calculation
        const a = [0, 1, 2, 3];
        const b = [0, 1];
        const ops = diff({ arr: a }, { arr: b });
        const removals = ops.filter((op) => op.op === 'remove');
        expect(removals).toHaveLength(2);
        // First removal must target index 3, second must target index 2
        expect(removals[0]).toEqual({ op: 'remove', path: '/arr/3' });
        expect(removals[1]).toEqual({ op: 'remove', path: '/arr/2' });
    });

    it('diff removes one trailing element with correct index', () => {
        const ops = diff({ arr: [10, 20, 30] }, { arr: [10, 20] });
        expect(ops).toContainEqual({ op: 'remove', path: '/arr/2' });
    });
});

// ── JsonPatch — applyPatch preflight atomicity (L126-128 hasTestOps) ──────────
describe('JsonPatch — applyPatch preflight atomicity', () => {
    it('rolls back all operations when a test op fails after a successful add', () => {
        // Kills ConditionalExpression mutant: hasTestOps bypass
        // Without preflight: add executes, test fails, but add is not rolled back
        const data = { a: 1 };
        expect(() =>
            applyPatch(data, [
                { op: 'add', path: '/b', value: 99 },
                { op: 'test', path: '/a', value: 99 }, // fails → entire patch invalid
            ]),
        ).toThrow();
        // Original data must remain untouched (atomicity)
        expect(data).toEqual({ a: 1 });
    });

    it('applies all operations when no test ops are present (fast path)', () => {
        // When hasTestOps = false, the fast path is taken (no clone + preflight)
        const result = applyPatch({ a: 1 }, [
            { op: 'add', path: '/b', value: 2 },
            { op: 'replace', path: '/a', value: 10 },
        ]);
        expect(result).toEqual({ a: 10, b: 2 });
    });
});

// ── JsonPatch — deepEqual null/array boundary (L290, L293) ───────────────────
describe('JsonPatch — deepEqual null/array boundary', () => {
    it('diff considers null and non-null as different (kills L290 && mutant)', () => {
        // Kills LogicalOperator mutant: a === null || b === null → &&
        // With mutant (&&): null vs {} would NOT short-circuit → deepEqual could return true
        // With original (||): null vs any non-null → immediately returns false
        const ops = diff({ x: null }, { x: {} });
        expect(ops).toHaveLength(1);
        expect(ops[0]).toEqual({ op: 'replace', path: '/x', value: {} });
    });

    it('deepEqual returns true for two null values', () => {
        // null === null short-circuits at `a === b` check (L287), not null guard
        const ops = diff({ x: null }, { x: null });
        expect(ops).toHaveLength(0);
    });

    it('diff handles array vs plain-object correctly (kills L293 || mutant)', () => {
        // Kills LogicalOperator mutant: Array.isArray(a) && Array.isArray(b) → ||
        // With mutant (||): array vs object would enter array-diff branch → wrong ops
        // With original (&&): only when BOTH are arrays → falls through to isPlainObject check
        const ops = diff({ x: [1, 2] }, { x: { 0: 1, 1: 2 } });
        // Array vs plain object is not same type → should emit a replace
        expect(ops).toHaveLength(1);
        expect(ops[0].op).toBe('replace');
    });

    it('deepEqual: two equal arrays returns true (no diff ops)', () => {
        const ops = diff({ a: [1, 2, 3] }, { a: [1, 2, 3] });
        expect(ops).toHaveLength(0);
    });

    it('deepEqual: array vs different-length array returns false', () => {
        const ops = diff({ a: [1, 2] }, { a: [1, 2, 3] });
        expect(ops.length).toBeGreaterThan(0);
    });
});
