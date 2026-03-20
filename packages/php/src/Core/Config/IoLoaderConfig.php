<?php

declare(strict_types=1);

namespace SafeAccessInline\Core\Config;

/**
 * Configuration for HTTP request behaviour in {@see IoLoader::fetchUrl()}.
 *
 * Controls cURL timeout values used when fetching remote URLs via HTTPS.
 */
final readonly class IoLoaderConfig
{
    /** Default total cURL request timeout in seconds. */
    public const DEFAULT_CURL_TIMEOUT = 10;

    /** Default cURL connection-phase timeout in seconds. */
    public const DEFAULT_CURL_CONNECT_TIMEOUT = 5;

    /**
     * Creates a new I/O loader configuration with optional overrides.
     *
     * @param int $curlTimeout        Total cURL request timeout in seconds.
     * @param int $curlConnectTimeout cURL connection-phase timeout in seconds.
     */
    public function __construct(
        public int $curlTimeout = self::DEFAULT_CURL_TIMEOUT,
        public int $curlConnectTimeout = self::DEFAULT_CURL_CONNECT_TIMEOUT,
    ) {
    }
}
