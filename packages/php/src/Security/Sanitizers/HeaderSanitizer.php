<?php

declare(strict_types=1);

namespace SafeAccessInline\Security\Sanitizers;

/**
 * HTTP header sanitizer protecting against HTTP Response Splitting (CWE-113)
 * and header injection attacks (OWASP A03:2021 — Injection).
 *
 * Mirrors the behaviour of the TypeScript `sanitizeHeaders()` function for
 * cross-language parity.
 */
final class HeaderSanitizer
{
    /**
     * RFC 7230 §3.2 token grammar — valid characters for HTTP header names.
     *
     * Allowed: `!`, `#`, `$`, `%`, `&`, `'`, `*`, `+`, `-`, `.`, `^`, `_`,
     * `` ` ``, `|`, `~`, digits, and ASCII letters.
     */
    private const VALID_HEADER_NAME_RE = '/^[!#$%&\'*+\-.^_`|~0-9a-zA-Z]+$/';

    /**
     * Sanitises an HTTP headers map before attaching it to an outgoing request.
     *
     * The following rules are applied to every entry:
     * - **CRLF in value** — `\r` and `\n` are removed (HTTP response splitting prevention).
     * - **Control characters in value** — all ASCII controls < 0x20 (except `\t` U+0009)
     *   and DEL (0x7F) are stripped.
     * - **Invalid header name** — entries whose name does not match the RFC 7230 token
     *   grammar are silently dropped.
     * - **Header names** are normalised to lowercase for consistent downstream comparison.
     * - **Empty / null input** — treated as an empty map; no exception is thrown.
     *
     * @param array<string, string> $headers Raw header map (`name → value`).
     * @return array<string, string> Sanitised header map. The input is never mutated.
     */
    public static function sanitizeHeaders(array $headers): array
    {
        $result = [];

        foreach ($headers as $name => $value) {
            // Drop headers whose name does not conform to RFC 7230 token grammar.
            if (!preg_match(self::VALID_HEADER_NAME_RE, $name)) {
                continue;
            }

            // Strip CRLF sequences and other ASCII control characters from the value,
            // while preserving horizontal tab (U+0009) which is valid whitespace in HTTP/1.1.
            $sanitized = preg_replace('/[\r\n]/', '', $value) ?? '';
            $sanitized = preg_replace('/[\x00-\x08\x0B-\x1F\x7F]/', '', $sanitized) ?? '';

            $result[strtolower($name)] = $sanitized;
        }

        return $result;
    }
}
