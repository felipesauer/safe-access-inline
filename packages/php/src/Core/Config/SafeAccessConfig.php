<?php

declare(strict_types=1);

namespace SafeAccessInline\Core\Config;

/**
 * Configuration for the {@see SafeAccess} façade.
 *
 * Limits static state growth by capping the number of custom accessor types
 * that can be registered via {@see \SafeAccessInline\SafeAccess::extend()}.
 */
final readonly class SafeAccessConfig
{
    /** Maximum number of custom accessor types that can be registered via extend(). */
    public const DEFAULT_MAX_CUSTOM_ACCESSORS = 50;

    /**
     * @param int $maxCustomAccessors Maximum number of custom accessor types registrable via extend().
     */
    public function __construct(
        public int $maxCustomAccessors = self::DEFAULT_MAX_CUSTOM_ACCESSORS,
    ) {
    }
}
