import { AuditEventType } from '../../enums/audit-event-type.enum';
import type { AuditEvent, AuditListener } from '../../contracts/audit-event.interface';

export { AuditEventType } from '../../enums/audit-event-type.enum';
export type { AuditEvent, AuditListener } from '../../contracts/audit-event.interface';

import { type AuditConfig, DEFAULT_AUDIT_CONFIG } from '../../core/config/audit-config';

const listeners: AuditListener[] = [];

let MAX_LISTENERS = DEFAULT_AUDIT_CONFIG.maxListeners;

/**
 * Reconfigures the audit emitter at runtime.
 *
 * Updates the maximum number of concurrent listeners. Listeners already registered
 * are **not** removed — only future `onAudit()` calls are checked against the new cap.
 * If the new `maxListeners` is lower than the current listener count, a `console.warn`
 * is emitted to alert the operator; the existing listeners continue to fire normally.
 *
 * **PHP alignment:** mirrors `AuditLogger::configure(AuditConfig $config)` in the PHP package.
 *
 * @param config - New {@link AuditConfig} to apply.
 */
export function configure(config: AuditConfig): void {
    if (config.maxListeners < listeners.length) {
        console.warn(
            `[AuditEmitter] configure(): new maxListeners (${config.maxListeners}) is lower than ` +
                `the current listener count (${listeners.length}). Existing listeners are preserved.`,
        );
    }
    MAX_LISTENERS = config.maxListeners;
}

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
        } catch (err) {
            // Isolate listener errors so subsequent listeners still fire.
            // Log to stderr so failing listeners are observable in production.
            console.warn('[AuditEmitter] Listener threw an error and was suppressed:', err);
        }
    }
}

/** Removes all registered audit listeners. */
export function clearAuditListeners(): void {
    listeners.length = 0;
}
