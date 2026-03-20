/**
 * Configuration for HTTP request behaviour in {@link fetchUrl}.
 *
 * Controls the total request timeout and the TCP connection-phase timeout
 * used when fetching remote URLs via HTTPS.
 */
export interface IoLoaderConfig {
    /** Total request timeout in milliseconds. */
    readonly requestTimeoutMs: number;
    /** Maximum milliseconds to wait while establishing the TCP connection. */
    readonly connectTimeoutMs: number;
}

/** @internal */
export const DEFAULT_IO_LOADER_CONFIG: IoLoaderConfig = Object.freeze({
    requestTimeoutMs: 10_000,
    connectTimeoutMs: 5_000,
});
