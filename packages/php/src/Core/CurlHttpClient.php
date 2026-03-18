<?php

declare(strict_types=1);

namespace SafeAccessInline\Core;

use SafeAccessInline\Contracts\HttpClientInterface;
use SafeAccessInline\Exceptions\SecurityException;

final class CurlHttpClient implements HttpClientInterface
{
    /**
     * @param string $url
     * @param array<int, mixed> $curlOptions
     * @return string
     * @throws SecurityException
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
