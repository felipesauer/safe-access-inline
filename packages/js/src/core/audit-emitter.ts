export type AuditEventType =
    | 'file.read'
    | 'file.watch'
    | 'url.fetch'
    | 'security.violation'
    | 'data.mask'
    | 'data.freeze'
    | 'schema.validate';

export interface AuditEvent {
    type: AuditEventType;
    timestamp: number;
    detail: Record<string, unknown>;
}

export type AuditListener = (event: AuditEvent) => void;

const listeners: AuditListener[] = [];

const MAX_LISTENERS = 100;

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

export function emitAudit(type: AuditEventType, detail: Record<string, unknown>): void {
    if (listeners.length === 0) return;
    const event: AuditEvent = { type, timestamp: Date.now(), detail };
    for (const listener of listeners) {
        listener(event);
    }
}

export function clearAuditListeners(): void {
    listeners.length = 0;
}
