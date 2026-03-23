<?php

declare(strict_types=1);

namespace SafeAccessInline\Core\Io;

use SafeAccessInline\Contracts\HttpClientInterface;
use SafeAccessInline\Exceptions\SecurityException;
use SafeAccessInline\Security\Sanitizers\HeaderSanitizer;

/**
 * HTTP client backed by ext-curl.
 *
 * Implements {@see HttpClientInterface} using PHP's native cURL functions.
 */
class CurlHttpClient implements HttpClientInterface
{
    /**
     * Fetches remote content from a URL using cURL.
     *
     * Only HTTP 2xx responses are accepted. Any response with a status code
     * outside that range (redirect, client error, server error) throws a
     * {@see SecurityException} so that Location-header redirections and error
     * pages are never silently returned to the caller.
     *
     * @param  string             $url         The URL to fetch.
     * @param  array<int, mixed>  $curlOptions cURL option constants mapped to their values.
     * @return string Raw response body.
     *
     * @throws SecurityException If cURL initialization, the request, or the HTTP status code fails.
     */
    public function fetch(string $url, array $curlOptions): string
    {
        // Sanitise any custom HTTP headers to prevent CRLF injection (CWE-113).
        if (isset($curlOptions[CURLOPT_HTTPHEADER]) && is_array($curlOptions[CURLOPT_HTTPHEADER])) {
            /** @var array<string, string> $rawHeaders */
            $rawHeaders = $curlOptions[CURLOPT_HTTPHEADER];
            $sanitized = HeaderSanitizer::sanitizeHeaders($rawHeaders);
            // Re-format as cURL "Name: value" strings after sanitisation.
            $curlOptions[CURLOPT_HTTPHEADER] = array_map(
                static fn (string $name, string $value): string => "{$name}: {$value}",
                array_keys($sanitized),
                array_values($sanitized),
            );
        }

        $ch = $this->curlInit($url);
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

            /** @var int $httpCode */
            $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
            if ($httpCode > 0 && ($httpCode < 200 || $httpCode >= 300)) {
                throw new SecurityException(
                    "URL fetch returned HTTP {$httpCode} for '{$url}' — only 2xx responses are accepted."
                );
            }

            return $content;
        } finally {
            // curl_close() is a no-op since PHP 8.0 and deprecated since PHP 8.5;
            // the CurlHandle is freed automatically when it goes out of scope.
        }
    }

    /**
     * Initialize a cURL handle for the given URL.
     * Extracted as a protected method so tests can override it to simulate failures.
     *
     * @return \CurlHandle|false
     */
    protected function curlInit(string $url): \CurlHandle|false
    {
        return curl_init($url);
    }
}
