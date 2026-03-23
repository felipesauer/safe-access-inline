<?php

declare(strict_types=1);

use SafeAccessInline\Security\Sanitizers\HeaderSanitizer;

describe(HeaderSanitizer::class, function (): void {

    describe('sanitizeHeaders', function (): void {

        it('preserves a clean header intact', function (): void {
            $result = HeaderSanitizer::sanitizeHeaders(['Authorization' => 'Bearer token123']);
            expect($result)->toBe(['authorization' => 'Bearer token123']);
        });

        it('removes CRLF (\\r\\n) from header value', function (): void {
            $result = HeaderSanitizer::sanitizeHeaders(['X-Custom' => "hello\r\nX-Injected: evil"]);
            expect($result['x-custom'])->toBe('helloX-Injected: evil');
        });

        it('removes lone \\n from header value', function (): void {
            $result = HeaderSanitizer::sanitizeHeaders(['X-Test' => "line1\nline2"]);
            expect($result['x-test'])->toBe('line1line2');
        });

        it('removes lone \\r from header value', function (): void {
            $result = HeaderSanitizer::sanitizeHeaders(['X-Test' => "line1\rline2"]);
            expect($result['x-test'])->toBe('line1line2');
        });

        it('drops a header whose name contains a space (invalid RFC 7230 token)', function (): void {
            $result = HeaderSanitizer::sanitizeHeaders(['bad header' => 'value']);
            expect($result)->toBe([]);
        });

        it('drops a header whose name contains a control character', function (): void {
            $result = HeaderSanitizer::sanitizeHeaders(["\x01Name" => 'value']);
            expect($result)->toBe([]);
        });

        it('normalises header names to lowercase', function (): void {
            $result = HeaderSanitizer::sanitizeHeaders(['Content-Type' => 'application/json']);
            expect(array_key_exists('content-type', $result))->toBeTrue();
        });

        it('returns an empty array for empty input', function (): void {
            expect(HeaderSanitizer::sanitizeHeaders([]))->toBe([]);
        });

        it('strips null bytes from header value', function (): void {
            $result = HeaderSanitizer::sanitizeHeaders(['X-Null' => "val\x00ue"]);
            expect($result['x-null'])->toBe('value');
        });

        it('keeps multiple valid headers while only dropping invalid ones', function (): void {
            $result = HeaderSanitizer::sanitizeHeaders([
                'Accept'       => 'application/json',
                'bad header!'  => 'dropped',
                'X-Request-Id' => 'abc-123',
            ]);
            expect($result)->toHaveKey('accept');
            expect($result)->toHaveKey('x-request-id');
            expect($result)->not->toHaveKey('bad header!');
        });

        it('preserves horizontal tab (U+0009) in header values', function (): void {
            $result = HeaderSanitizer::sanitizeHeaders(['X-Tab' => "value\there"]);
            expect($result['x-tab'])->toBe("value\there");
        });

    });

});
