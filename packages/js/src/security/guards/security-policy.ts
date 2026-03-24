import { DEFAULT_SECURITY_OPTIONS, type SecurityOptions } from './security-options';

/**
 * Aggregate security configuration combining runtime limits, filesystem
 * restrictions, and data-sanitisation options.
 */
export interface SecurityPolicy extends SecurityOptions {
    allowedDirs?: string[];
    allowAnyPath?: boolean;
}

const DEFAULT_POLICY: SecurityPolicy = {
    maxDepth: DEFAULT_SECURITY_OPTIONS.maxDepth,
    maxPayloadBytes: DEFAULT_SECURITY_OPTIONS.maxPayloadBytes,
    maxKeys: DEFAULT_SECURITY_OPTIONS.maxKeys,
};

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
 * Returns the effective default security policy.
 *
 * If a global policy has been set via {@link setGlobalPolicy}, it is merged
 * on top of the built-in defaults.
 *
 * @returns The resolved policy.
 */
export function defaultPolicy(): SecurityPolicy {
    const base = { ...DEFAULT_POLICY };
    return globalPolicy ? { ...base, ...globalPolicy } : base;
}
