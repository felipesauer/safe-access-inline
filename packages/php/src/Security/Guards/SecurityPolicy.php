<?php

declare(strict_types=1);

namespace SafeAccessInline\Security\Guards;

/**
 * Unified security configuration.
 *
 * @phpstan-type UrlPolicy array{allowPrivateIps?: bool, allowedHosts?: string[], allowedPorts?: int[]}
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
        /** @var UrlPolicy|null */
        public readonly ?array $url = null,
        /** @var 'none'|'prefix'|'strip'|'error' */
        public readonly string $csvMode = 'none',
        /** @var string[] */
        public readonly array $maskPatterns = [],
    ) {
    }

    /**
     * Returns a strict policy suitable for user-facing or sensitive environments.
     *
     * Applies tight limits: 20 depth, 1 MB payload, 1 000 keys, HTTPS-only URLs,
     * and CSV injection errors.
     *
     * @return self Pre-configured strict policy instance.
     */
    public static function strict(): self
    {
        return new self(
            maxDepth: 20,
            maxPayloadBytes: 1_048_576,
            maxKeys: 1_000,
            csvMode: 'error', // reject injection attempts — never silently mutate in a strict context
            url: ['allowedPorts' => [443]], // HTTPS only; callers must supply allowedHosts
        );
    }

    /**
     * Returns a permissive policy suitable for trusted internal data processing.
     *
     * Applies relaxed limits: 1 024 depth, 100 MB payload, 100 000 keys.
     *
     * @return self Pre-configured permissive policy instance.
     */
    public static function permissive(): self
    {
        return new self(
            maxDepth: 1_024,
            maxPayloadBytes: 104_857_600,
            maxKeys: 100_000,
        );
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
     * @param array<string, mixed> $overrides
     */
    public function merge(array $overrides): self
    {
        /** @var int $maxDepth */
        $maxDepth = $overrides['maxDepth'] ?? $this->maxDepth;
        /** @var int $maxPayloadBytes */
        $maxPayloadBytes = $overrides['maxPayloadBytes'] ?? $this->maxPayloadBytes;
        /** @var int $maxKeys */
        $maxKeys = $overrides['maxKeys'] ?? $this->maxKeys;
        /** @var string[] $allowedDirs */
        $allowedDirs = $overrides['allowedDirs'] ?? $this->allowedDirs;
        /** @var bool $allowAnyPath */
        $allowAnyPath = $overrides['allowAnyPath'] ?? $this->allowAnyPath;
        /** @var 'none'|'prefix'|'strip'|'error' $csvMode */
        $csvMode = $overrides['csvMode'] ?? $this->csvMode;
        /** @var string[] $maskPatterns */
        $maskPatterns = $overrides['maskPatterns'] ?? $this->maskPatterns;

        /** @var array{allowPrivateIps?: bool, allowedHosts?: string[], allowedPorts?: int[]}|null $url */
        $url = isset($overrides['url']) && is_array($overrides['url'])
            ? array_merge($this->url ?? [], $overrides['url'])
            : $this->url;

        return new self(
            maxDepth: $maxDepth,
            maxPayloadBytes: $maxPayloadBytes,
            maxKeys: $maxKeys,
            allowedDirs: $allowedDirs,
            allowAnyPath: $allowAnyPath,
            url: $url,
            csvMode: $csvMode,
            maskPatterns: $maskPatterns,
        );
    }
}
