<?php

declare(strict_types=1);

namespace SafeAccessInline\Security;

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
        /** @var UrlPolicy|null */
        public readonly ?array $url = null,
        /** @var 'none'|'prefix'|'strip'|'error' */
        public readonly string $csvMode = 'none',
        /** @var string[] */
        public readonly array $maskPatterns = [],
    ) {
    }

    public static function strict(): self
    {
        return new self(
            maxDepth: 20,
            maxPayloadBytes: 1_048_576,
            maxKeys: 1_000,
            csvMode: 'strip',
        );
    }

    public static function permissive(): self
    {
        return new self(
            maxDepth: 1_024,
            maxPayloadBytes: 104_857_600,
            maxKeys: 100_000,
        );
    }

    // ── Global Policy ───────────────────────────────────

    private static ?self $global = null;

    public static function setGlobal(self $policy): void
    {
        self::$global = $policy;
    }

    public static function clearGlobal(): void
    {
        self::$global = null;
    }

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
            url: $url,
            csvMode: $csvMode,
            maskPatterns: $maskPatterns,
        );
    }
}
