/**
 * Configuration for HTTP request behaviour in {@link fetchUrl}.
 *
 * Controls the overall request timeout used when fetching remote URLs
 * via HTTPS. The timeout applies to the entire request lifecycle.
 */
export interface IoLoaderConfig {
    /** Total request timeout in milliseconds. */
    readonly requestTimeoutMs: number;
}

/** @internal */
export const DEFAULT_IO_LOADER_CONFIG: IoLoaderConfig = {
    requestTimeoutMs: 10_000,
};
