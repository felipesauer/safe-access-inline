import type { HttpClientInterface } from '../../contracts/http-client.interface';
import type { DnsResolverInterface } from '../../contracts/dns-resolver.interface';
import { DEFAULT_SECURITY_OPTIONS } from '../../security/guards/security-options';

/**
 * Configuration for HTTP request behaviour in {@link fetchUrl}.
 *
 * Controls the total request timeout, TCP connection-phase timeout,
 * per-request payload size cap, and optional injectable clients for
 * HTTP transport and DNS resolution.
 *
 * @example
 * ```typescript
 * import { configureIoLoader } from '@safe-access-inline/safe-access-inline';
 *
 * // Override timeouts and per-loader payload cap
 * configureIoLoader({ requestTimeoutMs: 15_000, maxPayloadBytes: 5_242_880 }); // 5 MB cap
 *
 * // Inject a custom HTTP client (e.g. for testing)
 * configureIoLoader({ httpClient: myMockClient });
 *
 * // Inject a custom DNS resolver (e.g. for corporate environments)
 * configureIoLoader({ dnsResolver: myCorpResolver });
 * ```
 */
export interface IoLoaderConfig {
    /** Total request timeout in milliseconds. */
    readonly requestTimeoutMs: number;
    /** Maximum milliseconds to wait while establishing the TCP connection. */
    readonly connectTimeoutMs: number;
    /**
     * Maximum allowed response body size in bytes.
     *
     * When set, this value takes precedence over the global
     * {@link DEFAULT_SECURITY_OPTIONS.maxPayloadBytes} constant,
     * allowing different payload caps per loader instance.
     *
     * Defaults to {@link DEFAULT_SECURITY_OPTIONS.maxPayloadBytes} (10 MB).
     *
     * **PHP alignment:** mirrors `IoLoaderConfig::$maxPayloadBytes` in the PHP package,
     * which likewise defaults to 10 MB and can be overridden per-request.
     */
    readonly maxPayloadBytes: number;
    /**
     * Optional injectable HTTP client.
     *
     * When provided, `fetchUrl()` uses this client for the actual HTTP request
     * instead of Node.js `https.request()`. SSRF URL validation and DNS pinning
     * are still performed before delegating to the custom client.
     *
     * Defaults to the built-in HTTPS client.
     */
    readonly httpClient?: HttpClientInterface;
    /**
     * Optional injectable DNS resolver.
     *
     * When provided, SSRF IP validation uses this resolver instead of Node.js
     * `dns/promises`. Useful for unit tests and corporate networks with
     * non-public DNS.
     *
     * Defaults to the native `dns/promises` module.
     */
    readonly dnsResolver?: DnsResolverInterface;
}

/** @internal */
export const DEFAULT_IO_LOADER_CONFIG: IoLoaderConfig = Object.freeze({
    requestTimeoutMs: 10_000,
    connectTimeoutMs: 5_000,
    maxPayloadBytes: DEFAULT_SECURITY_OPTIONS.maxPayloadBytes,
});
