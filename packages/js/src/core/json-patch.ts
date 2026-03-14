/**
 * JSON Patch operations per RFC 6902.
 * Provides diff generation and patch application.
 */

export type JsonPatchOp = {
    op: 'add' | 'remove' | 'replace' | 'move' | 'copy' | 'test';
    path: string;
    value?: unknown;
    from?: string;
};

/**
 * Generates a JSON Patch (RFC 6902) representing the differences between two objects.
 */
export function diff(
    a: Record<string, unknown>,
    b: Record<string, unknown>,
    basePath = '',
): JsonPatchOp[] {
    const ops: JsonPatchOp[] = [];

    const aKeys = Object.keys(a);
    const bKeys = Object.keys(b);

    // Removed keys
    for (const key of aKeys) {
        if (!(key in b)) {
            ops.push({ op: 'remove', path: `${basePath}/${escapePointer(key)}` });
        }
    }

    // Added or changed keys
    for (const key of bKeys) {
        const pointer = `${basePath}/${escapePointer(key)}`;

        if (!(key in a)) {
            ops.push({ op: 'add', path: pointer, value: b[key] });
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
                ops.push({ op: 'replace', path: pointer, value: b[key] });
            }
        }
    }

    return ops;
}

function diffArrays(a: unknown[], b: unknown[], basePath: string): JsonPatchOp[] {
    const ops: JsonPatchOp[] = [];

    const maxLen = Math.max(a.length, b.length);
    for (let i = 0; i < maxLen; i++) {
        const pointer = `${basePath}/${i}`;
        if (i >= a.length) {
            ops.push({ op: 'add', path: pointer, value: b[i] });
        } else if (i >= b.length) {
            // Remove from end to avoid index shifting
            ops.push({ op: 'remove', path: `${basePath}/${a.length - 1 - (i - b.length)}` });
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
                ops.push({ op: 'replace', path: pointer, value: b[i] });
            }
        }
    }

    return ops;
}

/**
 * Applies a JSON Patch (RFC 6902) to a data object. Returns a new object (immutable).
 */
export function applyPatch(
    data: Record<string, unknown>,
    ops: JsonPatchOp[],
): Record<string, unknown> {
    let result = structuredClone(data);

    for (const op of ops) {
        switch (op.op) {
            case 'add':
                result = setAtPointer(result, op.path, op.value);
                break;
            case 'remove':
                result = removeAtPointer(result, op.path);
                break;
            case 'replace':
                result = setAtPointer(result, op.path, op.value);
                break;
            case 'move': {
                const value = getAtPointer(result, op.from!);
                result = removeAtPointer(result, op.from!);
                result = setAtPointer(result, op.path, value);
                break;
            }
            case 'copy': {
                const value = getAtPointer(result, op.from!);
                result = setAtPointer(result, op.path, structuredClone(value));
                break;
            }
            case 'test': {
                const actual = getAtPointer(result, op.path);
                if (!deepEqual(actual, op.value)) {
                    throw new Error(
                        `Test operation failed: value at '${op.path}' does not match expected value.`,
                    );
                }
                break;
            }
        }
    }

    return result;
}

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

function escapePointer(key: string): string {
    return key.replace(/~/g, '~0').replace(/\//g, '~1');
}

function getAtPointer(data: unknown, pointer: string): unknown {
    const keys = parsePointer(pointer);
    let current = data;
    for (const key of keys) {
        if (Array.isArray(current)) {
            current = current[Number(key)];
        } else if (typeof current === 'object' && current !== null) {
            current = (current as Record<string, unknown>)[key];
        } else {
            return undefined;
        }
    }
    return current;
}

function setAtPointer(
    data: Record<string, unknown>,
    pointer: string,
    value: unknown,
): Record<string, unknown> {
    const keys = parsePointer(pointer);
    if (keys.length === 0) return value as Record<string, unknown>;

    const result = structuredClone(data);
    let current: unknown = result;

    for (let i = 0; i < keys.length - 1; i++) {
        const key = keys[i];
        if (Array.isArray(current)) {
            current = current[Number(key)];
        } else {
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
        (current as Record<string, unknown>)[lastKey] = value;
    }

    return result;
}

function removeAtPointer(data: Record<string, unknown>, pointer: string): Record<string, unknown> {
    const keys = parsePointer(pointer);
    if (keys.length === 0) return {};

    const result = structuredClone(data);
    let current: unknown = result;

    for (let i = 0; i < keys.length - 1; i++) {
        const key = keys[i];
        if (Array.isArray(current)) {
            current = current[Number(key)];
        } else {
            current = (current as Record<string, unknown>)[key];
        }
    }

    const lastKey = keys[keys.length - 1];
    if (Array.isArray(current)) {
        current.splice(Number(lastKey), 1);
    } else {
        delete (current as Record<string, unknown>)[lastKey];
    }

    return result;
}

function isPlainObject(val: unknown): val is Record<string, unknown> {
    return typeof val === 'object' && val !== null && !Array.isArray(val);
}

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
