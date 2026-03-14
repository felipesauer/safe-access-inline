import type { SecurityOptions } from './security-options';
import type { MaskPattern } from './data-masker';

export interface UrlPolicy {
    allowPrivateIps?: boolean;
    allowedHosts?: string[];
    allowedPorts?: number[];
}

export interface SecurityPolicy extends SecurityOptions {
    allowedDirs?: string[];
    url?: UrlPolicy;
    csvMode?: 'none' | 'prefix' | 'strip' | 'error';
    maskPatterns?: MaskPattern[];
}

const DEFAULT_POLICY: SecurityPolicy = {
    maxDepth: 512,
    maxPayloadBytes: 10_485_760,
    maxKeys: 10_000,
    csvMode: 'none',
};

export const STRICT_POLICY: SecurityPolicy = {
    maxDepth: 20,
    maxPayloadBytes: 1_048_576,
    maxKeys: 1_000,
    csvMode: 'strip',
};

export const PERMISSIVE_POLICY: SecurityPolicy = {
    maxDepth: 1_024,
    maxPayloadBytes: 104_857_600,
    maxKeys: 100_000,
    csvMode: 'none',
};

let globalPolicy: SecurityPolicy | null = null;

export function setGlobalPolicy(policy: SecurityPolicy): void {
    globalPolicy = policy;
}

export function clearGlobalPolicy(): void {
    globalPolicy = null;
}

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

export function defaultPolicy(): SecurityPolicy {
    const base = { ...DEFAULT_POLICY };
    return globalPolicy ? mergePolicy(base, globalPolicy) : base;
}
