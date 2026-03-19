/**
 * Identifies the category of an audit event emitted by the system.
 *
 * Used by {@link AuditEvent} to classify security, I/O, and lifecycle occurrences.
 */
export type AuditEventType =
    | 'file.read'
    | 'file.watch'
    | 'url.fetch'
    | 'security.violation'
    | 'security.deprecation'
    | 'data.mask'
    | 'data.freeze'
    | 'schema.validate'
    | 'plugin.overwrite';
