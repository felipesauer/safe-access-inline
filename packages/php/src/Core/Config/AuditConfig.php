<?php

declare(strict_types=1);

namespace SafeAccessInline\Core\Config;

/**
 * Configuration for the audit event emitter.
 *
 * @param int $maxListeners Maximum number of concurrent audit listeners allowed.
 */
final readonly class AuditConfig
{
    public const DEFAULT_MAX_LISTENERS = 100;

    public function __construct(
        public int $maxListeners = self::DEFAULT_MAX_LISTENERS,
    ) {
    }
}
