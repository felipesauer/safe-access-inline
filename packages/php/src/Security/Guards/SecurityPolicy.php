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
    // ── Strict preset limits ────────────────────────────────────────────────

    /** @internal Structural depth cap for strict environments (user-facing / sensitive data). */
    private const STRICT_MAX_DEPTH = 20;

    /** @internal Payload byte cap for strict environments (1 MB). */
    private const STRICT_MAX_PAYLOAD_BYTES = 1_048_576;

    /** @internal Key count cap for strict environments. */
    private const STRICT_MAX_KEYS = 1_000;

    // ── Permissive preset limits ────────────────────────────────────────────

    /** @internal Structural depth cap for permissive environments (trusted internal data). */
    private const PERMISSIVE_MAX_DEPTH = 1_024;

    /** @internal Payload byte cap for permissive environments (100 MB). */
    private const PERMISSIVE_MAX_PAYLOAD_BYTES = 104_857_600;

    /** @internal Key count cap for permissive environments. */
    private const PERMISSIVE_MAX_KEYS = 100_000;

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
            maxDepth: self::STRICT_MAX_DEPTH,
            maxPayloadBytes: self::STRICT_MAX_PAYLOAD_BYTES,
            maxKeys: self::STRICT_MAX_KEYS,
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
            maxDepth: self::PERMISSIVE_MAX_DEPTH,
            maxPayloadBytes: self::PERMISSIVE_MAX_PAYLOAD_BYTES,
            maxKeys: self::PERMISSIVE_MAX_KEYS,
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
     * Merges a base policy with a set of overrides, returning a new policy instance.
     *
     * `$overrides` may be either:
     *   - a **partial array** of field names → values (preferred, mirrors JS ergonomics), or
     *   - a **complete `SecurityPolicy` object** for full backward compatibility.
     *
     * Array fields (`allowedDirs`, `maskPatterns`) fall back to `$base` values when the
     * key is absent from `$overrides`, preserving useful base configuration. The `url`
     * sub-policy is shallow-merged so callers can extend only the properties they care about.
     *
     * Unknown array keys throw `\InvalidArgumentException` to catch typos early.
     *
     * **JS alignment:** mirrors `mergePolicy(base, overrides?: Partial<SecurityPolicy>)` in
     * the JS package, allowing callers to specify only the fields they want to override.
     *
     * @param  self                    $base            Foundation policy.
     * @param  self|array<string,mixed> $overrides       Policy object (BC) or partial array of overrides.
     * @return self New merged policy instance.
     *
     * @throws \InvalidArgumentException When `$overrides` contains an unrecognised key.
     *
     * @example
     * ```php
     * // Partial array override (preferred)
     * $policy = SecurityPolicy::mergePolicy($base, ['maxDepth' => 50]);
     *
     * // Full SecurityPolicy object (backward compatible)
     * $policy = SecurityPolicy::mergePolicy($base, SecurityPolicy::strict());
     * ```
     */
    public static function mergePolicy(self $base, self|array $overrides = []): self
    {
        if ($overrides instanceof self) {
            // Backward-compatible path: convert the full SecurityPolicy object to an array
            $overrides = [
                'maxDepth'        => $overrides->maxDepth,
                'maxPayloadBytes' => $overrides->maxPayloadBytes,
                'maxKeys'         => $overrides->maxKeys,
                'allowedDirs'     => $overrides->allowedDirs,
                'allowAnyPath'    => $overrides->allowAnyPath,
                'url'             => $overrides->url,
                'csvMode'         => $overrides->csvMode,
                'maskPatterns'    => $overrides->maskPatterns,
            ];
        }

        $validKeys = ['maxDepth', 'maxPayloadBytes', 'maxKeys', 'allowedDirs', 'allowAnyPath', 'url', 'csvMode', 'maskPatterns'];
        foreach (array_keys($overrides) as $key) {
            if (!in_array($key, $validKeys, true)) {
                throw new \InvalidArgumentException(
                    "SecurityPolicy::mergePolicy() received unknown override key '{$key}'. " .
                    'Valid keys: ' . implode(', ', $validKeys) . '.'
                );
            }
        }

        return $base->merge($overrides);
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
