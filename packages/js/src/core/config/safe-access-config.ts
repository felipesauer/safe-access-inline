/**
 * Configuration for the {@link SafeAccess} façade.
 */
export interface SafeAccessConfig {
    /** Maximum number of custom accessor types that can be registered via `extend()`. */
    readonly maxCustomAccessors: number;
}

/** Sensible defaults for {@link SafeAccessConfig}. */
export const DEFAULT_SAFE_ACCESS_CONFIG: SafeAccessConfig = Object.freeze({
    maxCustomAccessors: 50,
});
