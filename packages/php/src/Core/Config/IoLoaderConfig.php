<?php

declare(strict_types=1);

namespace SafeAccessInline\Core\Config;

/**
 * Configuration for HTTP request behaviour in {@see IoLoader::fetchUrl()}.
 *
 * Controls cURL timeout values and payload size limits used when fetching
 * remote URLs via HTTPS.
 */
final readonly class IoLoaderConfig
{
    /** Default total cURL request timeout in seconds. */
    public const DEFAULT_CURL_TIMEOUT = 10;

    /** Default cURL connection-phase timeout in seconds. */
    public const DEFAULT_CURL_CONNECT_TIMEOUT = 5;

    /**
     * Default maximum response payload in bytes (10 MB).
     *
     * This mirrors {@see \SafeAccessInline\Security\Guards\SecurityOptions::MAX_PAYLOAD_BYTES}
     * and is enforced in two layers:
     *   1. Via `CURLOPT_MAXFILESIZE` (aborts early when `Content-Length` reports over the limit).
     *   2. Via a post-fetch byte-count check (catches responses without `Content-Length`).
     */
    public const DEFAULT_MAX_PAYLOAD_BYTES = 10 * 1024 * 1024; // 10 MB

    /**
     * Creates a new I/O loader configuration with optional overrides.
     *
     * @param int $curlTimeout        Total cURL request timeout in seconds.
     * @param int $curlConnectTimeout cURL connection-phase timeout in seconds.
     * @param int $maxPayloadBytes    Maximum response body size in bytes.
     */
    public function __construct(
        public int $curlTimeout = self::DEFAULT_CURL_TIMEOUT,
        public int $curlConnectTimeout = self::DEFAULT_CURL_CONNECT_TIMEOUT,
        public int $maxPayloadBytes = self::DEFAULT_MAX_PAYLOAD_BYTES,
    ) {
    }
}
