<?php

declare(strict_types=1);

namespace SafeAccessInline\Core\Io;

use SafeAccessInline\Contracts\HttpClientInterface;
use SafeAccessInline\Exceptions\SecurityException;

/**
 * HTTP client backed by ext-curl.
 *
 * Implements {@see HttpClientInterface} using PHP's native cURL functions.
 */
final class CurlHttpClient implements HttpClientInterface
{
    /**
     * Fetches remote content from a URL using cURL.
     *
     * @param  string             $url         The URL to fetch.
     * @param  array<int, mixed>  $curlOptions cURL option constants mapped to their values.
     * @return string Raw response body.
     *
     * @throws SecurityException If cURL initialisation or the request fails.
     */
    public function fetch(string $url, array $curlOptions): string
    {
        $ch = curl_init($url);
        if ($ch === false) {
            throw new SecurityException("Failed to initialize cURL for URL: '{$url}'");
        }

        try {
            curl_setopt_array($ch, $curlOptions);

            $content = curl_exec($ch);
            $errno = curl_errno($ch);

            if ($errno !== 0 || !is_string($content)) {
                throw new SecurityException("Failed to fetch URL: '{$url}'");
            }

            return $content;
        } finally {
            // curl_close() is a no-op since PHP 8.0 and deprecated since PHP 8.5;
            // the CurlHandle is freed automatically when it goes out of scope.
        }
    }
}
