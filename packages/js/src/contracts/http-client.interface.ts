/**
 * Options for an outgoing HTTP request.
 *
 * Used by {@link HttpClientInterface.fetch} to allow callers to customise
 * headers, timeouts, and cancellation on a per-request basis.
 */
export interface HttpRequestOptions {
    /**
     * Additional HTTP request headers (name → value).
     *
     * Header names are case-insensitive; values must not contain CRLF sequences
     * to prevent HTTP response splitting. Apply {@link sanitizeHeaders} before
     * forwarding user-supplied headers.
     */
    headers?: Record<string, string>;

    /**
     * Maximum total time in milliseconds to wait for the response body.
     *
     * When omitted, the implementation falls back to its own default timeout.
     */
    timeout?: number;

    /**
     * An `AbortSignal` that can be used to cancel the request.
     *
     * Compatible with the global `AbortController.signal`.
     */
    signal?: AbortSignal;
}

/**
 * A minimal HTTP response surface used by {@link HttpClientInterface}.
 *
 * Mirrors the subset of the WHATWG `Response` interface that the IoLoader
 * requires, making it straightforward to satisfy with the native `fetch` API
 * or any custom implementation.
 */
export interface HttpResponse {
    /** `true` when the status code is in the 200–299 range. */
    readonly ok: boolean;

    /** HTTP status code (e.g. `200`, `404`). */
    readonly status: number;

    /** Returns the response body as a UTF-8 decoded string. */
    text(): Promise<string>;

    /** Parses and returns the response body as JSON. */
    json(): Promise<unknown>;
}

/**
 * Injectable HTTP client contract for the IoLoader.
 *
 * Providing a custom implementation enables full control over HTTP transport
 * in tests (mocks, interceptors) and production (proxy configuration, retries,
 * custom TLS settings, etc.).
 *
 * The default implementation uses Node.js `https.request()` with built-in
 * SSRF protection. A custom implementation bypasses the built-in HTTPS request
 * path but SSRF URL validation and DNS pinning are still applied beforehand.
 *
 * @example
 * ```typescript
 * // Custom HTTP client for testing
 * const mockClient: HttpClientInterface = {
 *   async fetch(url, _options) {
 *     return {
 *       ok: true,
 *       status: 200,
 *       text: async () => '{"key":"value"}',
 *       json: async () => ({ key: 'value' }),
 *     };
 *   },
 * };
 *
 * configureIoLoader({ httpClient: mockClient });
 * ```
 */
export interface HttpClientInterface {
    /**
     * Performs an HTTP GET request to `url` and returns the response.
     *
     * @param url - The absolute HTTPS URL to fetch.
     * @param options - Optional per-request options (headers, timeout, signal).
     * @returns A promise resolving to the HTTP response.
     * @throws When the request fails or times out.
     */
    fetch(url: string, options?: HttpRequestOptions): Promise<HttpResponse>;
}
