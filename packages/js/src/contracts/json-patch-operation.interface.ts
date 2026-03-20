/**
 * A single JSON Patch operation as defined by RFC 6902.
 *
 * @see https://datatracker.ietf.org/doc/html/rfc6902
 */
export type JsonPatchOperation = {
    /** The operation to perform. */
    op: 'add' | 'remove' | 'replace' | 'move' | 'copy' | 'test';
    /** JSON Pointer (RFC 6901) targeting the value. */
    path: string;
    /** Value for `add`, `replace`, and `test` operations. */
    value?: unknown;
    /** Source JSON Pointer for `move` and `copy` operations. */
    from?: string;
};
