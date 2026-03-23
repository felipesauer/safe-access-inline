import { SecurityError } from '../../exceptions/security.error';

/**
 * RFC 7230 §3.2 token characters for valid HTTP header names.
 *
 * Allowed: `!`, `#`, `$`, `%`, `&`, `'`, `*`, `+`, `-`, `.`, `^`, `_`,
 * `` ` ``, `|`, `~`, digits, and letters.
 */
const VALID_HEADER_NAME_RE = /^[!#$%&'*+\-.^_`|~0-9a-zA-Z]+$/;

/**
 * Strips CRLF sequences and ASCII control characters (< 0x20, except `\t`)
 * from an HTTP header value.
 *
 * `\t` (0x09) is a valid header-value whitespace character per HTTP/1.1.
 *
 * @param value - The raw header value string.
 * @returns The sanitised value, stripped of dangerous sequences.
 */
function sanitizeHeaderValue(value: string): string {
    // Remove CRLF sequences (HTTP response splitting prevention)
    // and any other ASCII control characters except horizontal tab (U+0009).
    // Use \u escapes to satisfy no-control-regex ESLint rule.
    return (
        value
            .replace(/[\r\n]/g, '')
            // eslint-disable-next-line no-control-regex
            .replace(/[\u0000-\u0008\u000b-\u001f\u007f]/g, '')
    );
}

/**
 * Sanitises an HTTP headers map before attaching it to an outgoing request.
 *
 * Protects against **HTTP Response Splitting** (CWE-113) and invalid header
 * injection. The following rules are applied to every entry:
 *
 * - **CRLF in value** — `\r` and `\n` are removed (no splitting possible).
 * - **Control chars in value** — all ASCII controls below `0x20` except `\t`
 *   are stripped.
 * - **Invalid header name** — entries whose name does not match the RFC 7230
 *   token grammar are silently dropped (not included in the output).
 * - **Header names** are normalised to lowercase for consistent downstream
 *   comparison.
 * - **Null / undefined input** — treated as an empty map; no exception is thrown.
 *
 * @param headers - Raw header map (`name → value`) or `null` / `undefined`.
 * @returns A new sanitised `Record<string, string>`. The input is never mutated.
 *
 * @example
 * ```typescript
 * import { sanitizeHeaders } from '@safe-access-inline/safe-access-inline';
 *
 * // Sanitise user-supplied headers before forwarding to an upstream request
 * const safe = sanitizeHeaders({
 *   'X-Custom':   'hello\r\nX-Injected: evil',
 *   'Authorization': 'Bearer token123',
 *   'bad header!': 'value', // dropped — invalid name
 * });
 * // {
 * //   'x-custom':      'helloX-Injected: evil',   ← CRLF removed
 * //   'authorization': 'Bearer token123',
 * // }
 * ```
 */
export function sanitizeHeaders(
    headers: Record<string, string> | null | undefined,
): Record<string, string> {
    if (headers == null) return {};

    const result: Record<string, string> = {};
    for (const [rawName, rawValue] of Object.entries(headers)) {
        const name = rawName.toLowerCase();
        if (!VALID_HEADER_NAME_RE.test(name)) {
            // Drop entries with invalid names — do not throw; silently sanitise.
            continue;
        }
        result[name] = sanitizeHeaderValue(String(rawValue));
    }
    return result;
}

// Re-export SecurityError for use in tests importing from this module
export { SecurityError };
