/**
 * Configuration for the audit event emitter.
 */
export interface AuditConfig {
    /** Maximum number of concurrent audit listeners allowed. */
    readonly maxListeners: number;
}

/** Sensible defaults for {@link AuditConfig}. */
export const DEFAULT_AUDIT_CONFIG: AuditConfig = Object.freeze({
    maxListeners: 100,
});
