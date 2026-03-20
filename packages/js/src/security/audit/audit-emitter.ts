import { AuditEventType } from '../../enums/audit-event-type.enum';
import type { AuditEvent, AuditListener } from '../../contracts/audit-event.interface';

export { AuditEventType } from '../../enums/audit-event-type.enum';
export type { AuditEvent, AuditListener } from '../../contracts/audit-event.interface';

import { DEFAULT_AUDIT_CONFIG } from '../../core/config/audit-config';

const listeners: AuditListener[] = [];

const MAX_LISTENERS = DEFAULT_AUDIT_CONFIG.maxListeners;

/**
 * Registers an audit listener that is invoked for every {@link emitAudit} call.
 *
 * @param listener - Callback receiving each {@link AuditEvent}.
 * @returns An unsubscribe function that removes this listener.
 * @throws {RangeError} If the maximum listener count is already reached.
 */
export function onAudit(listener: AuditListener): () => void {
    if (listeners.length >= MAX_LISTENERS) {
        throw new RangeError(
            `[AuditEmitter] Max listener count (${MAX_LISTENERS}) reached. ` +
                'Call the returned unsubscriber or clearAuditListeners() between registrations.',
        );
    }
    listeners.push(listener);
    return () => {
        const idx = listeners.indexOf(listener);
        if (idx >= 0) listeners.splice(idx, 1);
    };
}

/**
 * Broadcasts an audit event to all registered listeners.
 *
 * Listener errors are silently swallowed so one failing listener
 * cannot prevent subsequent listeners from firing.
 *
 * @param type - The audit event category.
 * @param detail - Arbitrary metadata attached to the event.
 */
export function emitAudit(type: AuditEventType, detail: Record<string, unknown>): void {
    if (listeners.length === 0) return;
    const event: AuditEvent = { type, timestamp: Date.now(), detail };
    const snapshot = [...listeners];
    for (const listener of snapshot) {
        try {
            listener(event);
        } catch {
            // Isolate listener errors so subsequent listeners still fire
        }
    }
}

/** Removes all registered audit listeners. */
export function clearAuditListeners(): void {
    listeners.length = 0;
}
