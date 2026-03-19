<?php

declare(strict_types=1);

namespace SafeAccessInline\Core\Config;

/**
 * Configuration for the {@see SafeAccess} façade.
 *
 * @param int $maxCustomAccessors Maximum number of custom accessor types registrable via extend().
 */
final readonly class SafeAccessConfig
{
    public const DEFAULT_MAX_CUSTOM_ACCESSORS = 50;

    public function __construct(
        public int $maxCustomAccessors = self::DEFAULT_MAX_CUSTOM_ACCESSORS,
    ) {
    }
}
