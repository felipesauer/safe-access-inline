<?php

declare(strict_types=1);

namespace SafeAccessInline\Security\Guards;

/**
 * Unified security configuration.
 */
final class SecurityPolicy
{
    public function __construct(
        public readonly int $maxDepth = 512,
        public readonly int $maxPayloadBytes = 10_485_760,
        public readonly int $maxKeys = 10_000,
        /** @var string[] */
        public readonly array $allowedDirs = [],
        public readonly bool $allowAnyPath = false,
    ) {
    }

    // ── Global Policy ───────────────────────────────────

    /** @var self|null The process-wide policy applied when none is supplied per-call. */
    private static ?self $global = null;

    /**
     * Registers a process-wide default policy.
     *
     * @param self $policy Policy to apply globally.
     */
    public static function setGlobal(self $policy): void
    {
        self::$global = $policy;
    }

    /**
     * Removes the process-wide default policy.
     */
    public static function clearGlobal(): void
    {
        self::$global = null;
    }

    /**
     * Returns the current process-wide default policy, or null if none is set.
     *
     * @return self|null The globally registered policy, or null.
     */
    public static function getGlobal(): ?self
    {
        return self::$global;
    }

    /**
     * Returns the effective default security policy.
     *
     * If a global policy has been installed via {@see setGlobal()}, returns it.
     * Otherwise returns a new instance with the built-in default limits.
     *
     * **JS alignment:** mirrors `defaultPolicy()` in the JS package, which returns
     * the global policy (if set) merged onto the built-in defaults.
     *
     * @return self The resolved default policy.
     */
    public static function getDefault(): self
    {
        return self::$global ?? new self();
    }

}
