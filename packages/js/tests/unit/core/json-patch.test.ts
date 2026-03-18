import { describe, it, expect } from 'vitest';
import { diff, applyPatch } from '../../../src/core/json-patch';
import type { JsonPatchOp } from '../../../src/core/json-patch';
import { SafeAccess } from '../../../src/safe-access';
import { JsonPatchTestFailedError } from '../../../src/exceptions/json-patch-test-failed.error';

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
        const ops: JsonPatchOp[] = [{ op: 'test', path: '/a', value: 1 }];
        expect(() => applyPatch({ a: 1 }, ops)).not.toThrow();
    });

    it('test operation fails for non-matching value', () => {
        const ops: JsonPatchOp[] = [{ op: 'test', path: '/a', value: 999 }];
        expect(() => applyPatch({ a: 1 }, ops)).toThrow('Test operation failed');
    });

    it('test operation throws JsonPatchTestFailedError', () => {
        const ops: JsonPatchOp[] = [{ op: 'test', path: '/a', value: 999 }];
        try {
            applyPatch({ a: 1 }, ops);
            expect.unreachable('should throw');
        } catch (err) {
            expect(err).toBeInstanceOf(JsonPatchTestFailedError);
            expect(err).toBeInstanceOf(Error);
        }
    });

    it('applies multiple operations sequentially', () => {
        const ops: JsonPatchOp[] = [
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
        expect(() => applyPatch({ a: 1 }, [{ op: 'move', path: '/b' } as JsonPatchOp])).toThrow(
            "JSON Patch 'move' operation requires a 'from' field",
        );
    });

    it('applyPatch — throws when copy operation is missing from field', () => {
        expect(() => applyPatch({ a: 1 }, [{ op: 'copy', path: '/b' } as JsonPatchOp])).toThrow(
            "JSON Patch 'copy' operation requires a 'from' field",
        );
    });
});
