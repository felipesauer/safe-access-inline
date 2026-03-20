<?php

use SafeAccessInline\Core\Io\CurlHttpClient;
use SafeAccessInline\Exceptions\SecurityException;

describe(CurlHttpClient::class, function () {

    // ── fetch — curl_init failure (line 30) ─────────────────────────────

    it('fetch — throws SecurityException when curlInit returns false (line 30)', function () {
        // Anonymous subclass overrides curlInit() to simulate curl_init() failure.
        // In PHP 8, curl_init() only returns false if the URL is malformed at a very
        // low level; using a protected hook makes this branch reliably testable.
        $client = new class () extends CurlHttpClient {
            protected function curlInit(string $url): \CurlHandle|false
            {
                return false;
            }
        };

        $client->fetch('https://example.com', []);
    })->throws(SecurityException::class, 'Failed to initialize cURL');

    // ── fetch — curl_exec failure (line 43) ─────────────────────────────

    it('fetch — throws SecurityException when curl_exec returns an error (line 43)', function () {
        // Uses a real CurlHandle but with an invalid URL so curl_exec fails (errno != 0).
        // This exercises the `if ($errno !== 0 || !is_string($content))` branch (line 43).
        $client = new CurlHttpClient();
        $ch = curl_init('https://0.0.0.0:1');
        assert($ch !== false);

        // Force exec to fail by using a bogus resolve override and zero timeout.
        $client->fetch('https://0.0.0.0:1', [
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_TIMEOUT_MS     => 1,
            CURLOPT_CONNECTTIMEOUT_MS => 1,
            CURLOPT_SSL_VERIFYPEER => false,
            CURLOPT_SSL_VERIFYHOST => 0,
        ]);
    })->throws(SecurityException::class, 'Failed to fetch URL');

    // ── fetch — success path (line 43 return) ───────────────────────────

    it('fetch — returns body string on success (line 43 return $content)', function () {
        // Uses file:// protocol via a temp file so curl succeeds without network.
        // This exercises the `return $content;` statement (line 43).
        $tmp = tempnam(sys_get_temp_dir(), 'curl_ok_');
        file_put_contents($tmp, '{"ok":true}');

        try {
            $client = new CurlHttpClient();
            $body = $client->fetch('file://' . $tmp, [CURLOPT_RETURNTRANSFER => true]);
            expect($body)->toBe('{"ok":true}');
        } finally {
            unlink($tmp);
        }
    });
});
