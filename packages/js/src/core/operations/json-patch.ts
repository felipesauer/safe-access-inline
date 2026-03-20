import { JsonPatchTestFailedError } from '../../exceptions/json-patch-test-failed.error';
import { SecurityGuard } from '../../security/guards/security-guard';
import { PatchOperationType } from '../../enums/patch-operation-type.enum';
import type { JsonPatchOperation } from '../../contracts/json-patch-operation.interface';

export type { JsonPatchOperation } from '../../contracts/json-patch-operation.interface';

/**
 * JSON Patch operations per RFC 6902.
 * Provides diff generation and patch application.
 */

/**
 * Generates a JSON Patch (RFC 6902) representing the differences between two objects.
 *
 * Recursively compares `a` and `b`, producing the minimal set of `add`, `remove`,
 * and `replace` operations needed to transform `a` into `b`.
 *
 * @param a - Source ("before") object.
 * @param b - Target ("after") object.
 * @param basePath - JSON Pointer prefix for the current recursion level (default `''`).
 * @returns Array of RFC 6902 patch operations.
 */
export function diff(
    a: Record<string, unknown>,
    b: Record<string, unknown>,
    basePath = '',
): JsonPatchOperation[] {
    const ops: JsonPatchOperation[] = [];

    const aKeys = Object.keys(a);
    const bKeys = Object.keys(b);

    // Removed keys
    for (const key of aKeys) {
        if (!(key in b)) {
            ops.push({ op: PatchOperationType.REMOVE, path: `${basePath}/${escapePointer(key)}` });
        }
    }

    // Added or changed keys
    for (const key of bKeys) {
        const pointer = `${basePath}/${escapePointer(key)}`;

        if (!(key in a)) {
            ops.push({ op: PatchOperationType.ADD, path: pointer, value: b[key] });
        } else if (!deepEqual(a[key], b[key])) {
            const aVal = a[key];
            const bVal = b[key];

            if (isPlainObject(aVal) && isPlainObject(bVal)) {
                ops.push(
                    ...diff(
                        aVal as Record<string, unknown>,
                        bVal as Record<string, unknown>,
                        pointer,
                    ),
                );
            } else if (Array.isArray(aVal) && Array.isArray(bVal)) {
                ops.push(...diffArrays(aVal, bVal, pointer));
            } else {
                ops.push({ op: PatchOperationType.REPLACE, path: pointer, value: b[key] });
            }
        }
    }

    return ops;
}

/**
 * Generates patch operations for two arrays at the given `basePath`.
 *
 * Uses a positional comparison strategy: each index is compared individually.
 * Removes trailing elements before additions to preserve correct final length.
 *
 * @param a - Source array.
 * @param b - Target array.
 * @param basePath - JSON Pointer prefix for array elements.
 * @returns Array of RFC 6902 patch operations for the arrays.
 */
function diffArrays(a: unknown[], b: unknown[], basePath: string): JsonPatchOperation[] {
    const ops: JsonPatchOperation[] = [];

    const maxLen = Math.max(a.length, b.length);
    for (let i = 0; i < maxLen; i++) {
        const pointer = `${basePath}/${i}`;
        if (i >= a.length) {
            ops.push({ op: PatchOperationType.ADD, path: pointer, value: b[i] });
        } else if (i >= b.length) {
            // Remove from end to avoid index shifting
            ops.push({
                op: PatchOperationType.REMOVE,
                path: `${basePath}/${a.length - 1 - (i - b.length)}`,
            });
        } else if (!deepEqual(a[i], b[i])) {
            if (isPlainObject(a[i]) && isPlainObject(b[i])) {
                ops.push(
                    ...diff(
                        a[i] as Record<string, unknown>,
                        b[i] as Record<string, unknown>,
                        pointer,
                    ),
                );
            } else {
                ops.push({ op: PatchOperationType.REPLACE, path: pointer, value: b[i] });
            }
        }
    }

    return ops;
}

/**
 * Validates a JSON Patch operations array without applying it.
 *
 * Checks that `move` and `copy` operations include the required `from` field.
 *
 * @param ops - JSON Patch operations to validate.
 * @throws {@link Error} When a `move` or `copy` operation is missing `from`.
 */
export function validatePatch(ops: JsonPatchOperation[]): void {
    for (const op of ops) {
        if (
            (op.op === PatchOperationType.MOVE || op.op === PatchOperationType.COPY) &&
            op.from === undefined
        ) {
            throw new Error(`JSON Patch '${op.op}' operation requires a 'from' field.`);
        }
    }
}

/**
 * Applies a JSON Patch (RFC 6902) to a data object and returns a new object.
 *
 * Operations are atomic: if any `test` operation fails, no mutations are visible
 * to the caller. The original `data` is never mutated.
 *
 * @param data - Source data object.
 * @param ops - JSON Patch operations to apply.
 * @returns A new data object with all patches applied.
 * @throws {@link JsonPatchTestFailedError} When a `test` operation value mismatch is detected.
 * @throws {@link Error} When a `move` or `copy` operation is missing its `from` field.
 */
export function applyPatch(
    data: Record<string, unknown>,
    ops: JsonPatchOperation[],
): Record<string, unknown> {
    validatePatch(ops);

    // RFC 6902 §5: operations MUST be atomic; preflight validates test assertions before
    // mutating state. Skip preflight when no 'test' ops are present (the common case)
    // to avoid the O(2n) cost of cloning + traversing the document twice.
    const hasTestOps = ops.some((op) => op.op === PatchOperationType.TEST);

    if (!hasTestOps) {
        let result = structuredClone(data);
        for (const op of ops) {
            result = applyOneOp(result, op);
        }
        return result;
    }

    // Pre-flight: run all operations on a throwaway clone to validate test assertions atomically.
    // Return the preflight result directly — no need to clone and traverse a second time.
    let preflight = structuredClone(data);
    for (const op of ops) {
        preflight = applyOneOp(preflight, op);
    }
    return preflight;
}

/**
 * Applies a single JSON Patch operation to `result` (mutates in place).
 *
 * @param result - Working copy of the data object.
 * @param op - A single RFC 6902 operation.
 * @returns The (potentially replaced) root object after applying `op`.
 * @throws {@link JsonPatchTestFailedError} When a `test` operation fails.
 */
function applyOneOp(
    result: Record<string, unknown>,
    op: JsonPatchOperation,
): Record<string, unknown> {
    switch (op.op) {
        case PatchOperationType.ADD:
        case PatchOperationType.REPLACE:
            if (op.path === '') {
                result = (op.value ?? {}) as Record<string, unknown>;
            } else {
                mutateAtPointer(result, op.path, op.value);
            }
            break;
        case PatchOperationType.REMOVE:
            if (op.path === '') {
                result = {} as Record<string, unknown>;
            } else {
                mutateRemoveAtPointer(result, op.path);
            }
            break;
        case PatchOperationType.MOVE: {
            const value = getAtPointer(result, op.from!);
            if (op.from === '') {
                result = {} as Record<string, unknown>;
            } else {
                mutateRemoveAtPointer(result, op.from!);
            }
            if (op.path === '') {
                result = value as Record<string, unknown>;
            } else {
                mutateAtPointer(result, op.path, value);
            }
            break;
        }
        case PatchOperationType.COPY: {
            const value = getAtPointer(result, op.from!);
            const cloned = structuredClone(value);
            if (op.path === '') {
                result = cloned as Record<string, unknown>;
            } else {
                mutateAtPointer(result, op.path, cloned);
            }
            break;
        }
        case PatchOperationType.TEST: {
            const actual = getAtPointer(result, op.path);
            if (!deepEqual(actual, op.value)) {
                throw new JsonPatchTestFailedError(
                    `Test operation failed: value at '${op.path}' does not match expected value.`,
                );
            }
            break;
        }
    }
    return result;
}

/**
 * Parses an RFC 6901 JSON Pointer into an array of decoded key segments.
 *
 * @param pointer - A JSON Pointer string (e.g. `"/foo/bar/0"`).
 * @returns Array of decoded key strings.
 * @throws {@link Error} When `pointer` does not start with `'/'` and is non-empty.
 */
function parsePointer(pointer: string): string[] {
    if (pointer === '') return [];
    if (!pointer.startsWith('/')) {
        throw new Error(`Invalid JSON Pointer: '${pointer}'`);
    }
    return pointer
        .substring(1)
        .split('/')
        .map((s) => s.replace(/~1/g, '/').replace(/~0/g, '~'));
}

/**
 * Escapes a key for use in an RFC 6901 JSON Pointer.
 *
 * Replaces `~` with `~0` and `/` with `~1` per the spec.
 *
 * @param key - The raw object key to escape.
 * @returns The escaped key suitable for embedding in a JSON Pointer.
 */
function escapePointer(key: string): string {
    return key.replace(/~/g, '~0').replace(/\//g, '~1');
}

/**
 * Retrieves the value at the given JSON Pointer within `data`.
 *
 * @param data - The root data structure to traverse.
 * @param pointer - RFC 6901 JSON Pointer.
 * @returns The value at the pointer, or `undefined` if the path does not exist.
 */
function getAtPointer(data: unknown, pointer: string): unknown {
    const keys = parsePointer(pointer);
    let current = data;
    for (const key of keys) {
        if (Array.isArray(current)) {
            current = current[Number(key)];
        } else if (typeof current === 'object' && current !== null) {
            SecurityGuard.assertSafeKey(key);
            current = (current as Record<string, unknown>)[key];
        } else {
            return undefined;
        }
    }
    return current;
}

/** In-place mutation — caller must ensure `data` is already a working copy. */
function mutateAtPointer(data: Record<string, unknown>, pointer: string, value: unknown): void {
    const keys = parsePointer(pointer);

    let current: unknown = data;

    for (let i = 0; i < keys.length - 1; i++) {
        const key = keys[i];
        if (Array.isArray(current)) {
            current = current[Number(key)];
        } else {
            SecurityGuard.assertSafeKey(key);
            current = (current as Record<string, unknown>)[key];
        }
    }

    const lastKey = keys[keys.length - 1];
    if (Array.isArray(current)) {
        if (lastKey === '-') {
            current.push(value);
        } else {
            current[Number(lastKey)] = value;
        }
    } else {
        SecurityGuard.assertSafeKey(lastKey);
        (current as Record<string, unknown>)[lastKey] = value;
    }
}

/** In-place removal — caller must ensure `data` is already a working copy. */
function mutateRemoveAtPointer(data: Record<string, unknown>, pointer: string): void {
    const keys = parsePointer(pointer);

    let current: unknown = data;

    for (let i = 0; i < keys.length - 1; i++) {
        const key = keys[i];
        if (Array.isArray(current)) {
            current = current[Number(key)];
        } else {
            SecurityGuard.assertSafeKey(key);
            current = (current as Record<string, unknown>)[key];
        }
    }

    const lastKey = keys[keys.length - 1];
    if (Array.isArray(current)) {
        current.splice(Number(lastKey), 1);
    } else {
        SecurityGuard.assertSafeKey(lastKey);
        delete (current as Record<string, unknown>)[lastKey];
    }
}

/**
 * Checks whether `val` is a plain (non-array, non-null) object.
 *
 * @param val - Value to test.
 * @returns `true` if `val` is a plain object.
 */
function isPlainObject(val: unknown): val is Record<string, unknown> {
    return typeof val === 'object' && val !== null && !Array.isArray(val);
}

/**
 * Performs a deep structural equality check between two values.
 *
 * @param a - First value.
 * @param b - Second value.
 * @returns `true` if `a` and `b` are deeply equal.
 */
function deepEqual(a: unknown, b: unknown): boolean {
    if (a === b) return true;
    if (a === null || b === null) return false;
    if (typeof a !== typeof b) return false;

    if (Array.isArray(a) && Array.isArray(b)) {
        if (a.length !== b.length) return false;
        return a.every((val, i) => deepEqual(val, b[i]));
    }

    if (isPlainObject(a) && isPlainObject(b)) {
        const aKeys = Object.keys(a);
        const bKeys = Object.keys(b);
        if (aKeys.length !== bKeys.length) return false;
        return aKeys.every((key) => deepEqual(a[key], b[key]));
    }

    return false;
}
