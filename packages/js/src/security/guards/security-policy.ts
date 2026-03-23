import { DEFAULT_SECURITY_OPTIONS, type SecurityOptions } from './security-options';
import type { MaskPattern } from '../sanitizers/data-masker';

/** Network-level restrictions applied when fetching remote data sources. */
export interface UrlPolicy {
    allowPrivateIps?: boolean;
    allowedHosts?: string[];
    allowedPorts?: number[];
}

/**
 * Aggregate security configuration combining runtime limits, filesystem
 * restrictions, network policy, and data-sanitisation options.
 */
export interface SecurityPolicy extends SecurityOptions {
    allowedDirs?: string[];
    allowAnyPath?: boolean;
    url?: UrlPolicy;
    csvMode?: 'none' | 'prefix' | 'strip' | 'error';
    maskPatterns?: MaskPattern[];
}

const DEFAULT_POLICY: SecurityPolicy = {
    maxDepth: DEFAULT_SECURITY_OPTIONS.maxDepth,
    maxPayloadBytes: DEFAULT_SECURITY_OPTIONS.maxPayloadBytes,
    maxKeys: DEFAULT_SECURITY_OPTIONS.maxKeys,
    csvMode: 'none',
};

/**
 * Strict security policy preset.
 * NOTE: `allowedDirs` is intentionally not set — callers MUST provide it
 * via `mergePolicy(STRICT_POLICY, { allowedDirs: [...] })` when using
 * file-based operations, otherwise path traversal protection is not enforced.
 * NOTE: `url.allowedHosts` is left empty by default — any public host is allowed.
 * Callers SHOULD supply an explicit allowlist via
 * `mergePolicy(STRICT_POLICY, { url: { allowedHosts: [...] } })` if network
 * boundaries must be restricted.
 */
export const STRICT_POLICY: Readonly<SecurityPolicy> = Object.freeze({
    maxDepth: 20,
    maxPayloadBytes: 1_048_576,
    maxKeys: 1_000,
    csvMode: 'error', // reject injection attempts — never silently mutate in a strict context
    url: {
        allowedPorts: [443], // HTTPS only; callers must add allowedHosts
    },
});

export const PERMISSIVE_POLICY: Readonly<SecurityPolicy> = Object.freeze({
    maxDepth: 1_024,
    maxPayloadBytes: 104_857_600,
    maxKeys: 100_000,
    csvMode: 'none',
});

let globalPolicy: SecurityPolicy | null = null;

/**
 * Installs a process-wide security policy that is automatically merged into
 * every {@link defaultPolicy} call.
 *
 * @param policy - The policy to set as the global default.
 */
export function setGlobalPolicy(policy: SecurityPolicy): void {
    globalPolicy = policy;
}

/**
 * Removes the global security policy so {@link defaultPolicy} returns the built-in defaults.
 *
 * @returns `void`.
 */
export function clearGlobalPolicy(): void {
    globalPolicy = null;
}

/**
 * Returns the currently active global security policy.
 *
 * @returns The policy installed via {@link setGlobalPolicy}, or `null` if none is set.
 */
export function getGlobalPolicy(): SecurityPolicy | null {
    return globalPolicy;
}

/**
 * Shallow-merges `overrides` onto `base`, with special handling for the nested `url` field.
 *
 * @param base - The starting policy.
 * @param overrides - Partial policy values to overlay.
 * @returns A new merged policy (neither input is mutated).
 */
export function mergePolicy(
    base: SecurityPolicy,
    overrides?: Partial<SecurityPolicy>,
): SecurityPolicy {
    if (!overrides) return { ...base };

    return {
        ...base,
        ...overrides,
        url: overrides.url ? { ...base.url, ...overrides.url } : base.url,
    };
}

/**
 * Returns the effective default security policy.
 *
 * If a global policy has been set via {@link setGlobalPolicy}, it is merged
 * on top of the built-in defaults.
 *
 * @returns The resolved policy.
 */
export function defaultPolicy(): SecurityPolicy {
    const base = { ...DEFAULT_POLICY };
    return globalPolicy ? mergePolicy(base, globalPolicy) : base;
}
