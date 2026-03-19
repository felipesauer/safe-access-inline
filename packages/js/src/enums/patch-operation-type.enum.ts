/**
 * RFC 6902 JSON Patch operation types.
 */
export enum PatchOperationType {
    ADD = 'add',
    REMOVE = 'remove',
    REPLACE = 'replace',
    MOVE = 'move',
    COPY = 'copy',
    TEST = 'test',
}
