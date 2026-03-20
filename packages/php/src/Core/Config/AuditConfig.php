<?php

declare(strict_types=1);

namespace SafeAccessInline\Core\Config;

/**
 * Configuration for the audit event emitter.
 *
 * Controls the maximum number of simultaneous listeners that can be
 * registered via {@see \SafeAccessInline\Security\Audit\AuditLogger::onAudit()}.
 */
final readonly class AuditConfig
{
    /** Maximum number of concurrent audit listeners allowed. */
    public const DEFAULT_MAX_LISTENERS = 100;

    /**
     * @param int $maxListeners Maximum number of concurrent audit listeners allowed.
     */
    public function __construct(
        public int $maxListeners = self::DEFAULT_MAX_LISTENERS,
    ) {
    }
}
