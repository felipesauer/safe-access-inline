/**
 * Identifies the category of an audit event emitted by the system.
 *
 * Used by {@link AuditEvent} to classify security, I/O, and lifecycle occurrences.
 */
export enum AuditEventType {
    FILE_READ = 'file.read',
    FILE_WRITE = 'file.write',
    FILE_WATCH = 'file.watch',
    URL_FETCH = 'url.fetch',
    SECURITY_VIOLATION = 'security.violation',
    SECURITY_DEPRECATION = 'security.deprecation',
    DATA_MASK = 'data.mask',
    DATA_FREEZE = 'data.freeze',
    DATA_FORMAT_WARNING = 'data.format_warning',
    SCHEMA_VALIDATE = 'schema.validate',
    PLUGIN_OVERWRITE = 'plugin.overwrite',
}
