<?php

declare(strict_types=1);

namespace SafeAccessInline\Contracts;

use SafeAccessInline\Exceptions\SecurityException;

interface HttpClientInterface
{
    /**
     * Fetch the content of the given URL.
     *
     * @param string $url The URL to fetch
     * @param array<int, mixed> $curlOptions cURL options to apply
     * @return string The response body
     * @throws SecurityException On failure
     */
    public function fetch(string $url, array $curlOptions): string;
}
