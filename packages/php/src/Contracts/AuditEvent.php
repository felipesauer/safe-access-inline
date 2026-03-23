<?php

declare(strict_types=1);

namespace SafeAccessInline\Contracts;

use SafeAccessInline\Enums\AuditEventType;

/**
 * Represents a single audit event emitted by the system.
 *
 * Audit events are fired on security-relevant operations (file reads, URL fetches,
 * data masking, schema validation, etc.) and delivered to registered listeners.
 */
final readonly class AuditEvent
{
    /**
     * @param AuditEventType $type    The category of this audit event.
     * @param int            $timestamp Unix timestamp in milliseconds when the event was emitted.
     * @param array<string, mixed> $detail Arbitrary key-value metadata specific to the event type.
     */
    public function __construct(
        public AuditEventType $type,
        public int $timestamp,
        public array $detail,
    ) {
    }
}
