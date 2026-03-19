import type { AuditEventType } from '../enums/audit-event-type.enum';

/**
 * Represents a single audit event emitted by the system.
 *
 * Audit events are fired on security-relevant operations (file reads, URL fetches,
 * data masking, schema validation, etc.) and delivered to registered listeners.
 */
export interface AuditEvent {
    /** The category of this audit event. */
    type: AuditEventType;
    /** Unix timestamp (milliseconds) when the event was emitted. */
    timestamp: number;
    /** Arbitrary key-value metadata specific to the event type. */
    detail: Record<string, unknown>;
}

/**
 * Callback signature for audit event subscribers.
 *
 * @param event - The audit event being delivered.
 */
export type AuditListener = (event: AuditEvent) => void;
