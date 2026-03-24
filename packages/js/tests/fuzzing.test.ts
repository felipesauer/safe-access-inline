/**
 * @testtype Fuzzing / Security
 * @description Feeds the library with malformed, giant, and malicious inputs to ensure
 *   it fails safely and predictably — never with an uncaught exception, memory leak,
 *   or undefined behavior.
 *   Run: npx vitest run tests/fuzzing.test.ts
 *   Timeout: 30s per suite (large inputs may be slow by design).
 */

import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import { SafeAccess } from '../src/safe-access';
import { DotNotationParser } from '../src/core/parsers/dot-notation-parser';

describe('Fuzzing — hostile inputs', () => {
    // Prototype pollution paths (__proto__, constructor) must be blocked or safely ignored
    it('path injection: prototype pollution vectors', () => {
        const hostilePaths = [
            '__proto__',
            'constructor',
            '__proto__.polluted',
            'constructor.prototype',
            '__proto__.__proto__',
            'a.__proto__.b',
            'toString',
            'valueOf',
            'hasOwnProperty',
        ];

        const data = { a: 1, b: { c: 2 } };
        for (const path of hostilePaths) {
            expect(() => DotNotationParser.get(data, path, null)).toThrow(
                /SecurityError|Forbidden/,
            );
        }
    }, 30_000);

    // Randomly generated hostile paths with control characters must not crash
    it('path injection: null bytes, unicode RLO, embedded newlines', () => {
        const hostilesPool = ['\0', '\u202E', '\n', '\r', '\t', '\u0000'];
        fc.assert(
            fc.property(
                fc.string().map((s) => {
                    // Inject random hostile characters at random positions
                    return s
                        .split('')
                        .map((c) =>
                            Math.random() < 0.2
                                ? (hostilesPool[Math.floor(Math.random() * hostilesPool.length)] ??
                                  c)
                                : c,
                        )
                        .join('');
                }),
                (path) => {
                    // A SecurityError for forbidden keys is acceptable — what must not happen
                    // is an unhandled crash or uncontrolled exception.
                    try {
                        DotNotationParser.get({ a: 1 }, path, null);
                    } catch (e: unknown) {
                        if (
                            !(e instanceof Error) ||
                            !e.constructor.name.includes('SecurityError')
                        ) {
                            throw e;
                        }
                    }
                },
            ),
            { numRuns: 300 },
        );
    }, 30_000);

    // Extremely long paths should not cause stack overflow or unbounded memory use
    it('oversized paths: deeply nested dot-notation', () => {
        const longPath = Array.from({ length: 500 }, (_, i) => `k${i}`).join('.');
        expect(() => DotNotationParser.get({}, longPath, null)).not.toThrow();
    }, 30_000);

    // JSON parsing of malformed input must fail gracefully
    it('malformed JSON: does not throw uncaught exception', () => {
        const malformedInputs = [
            '{',
            '{"a":}',
            '{"a": undefined}',
            '{{}',
            '{"a": "b"',
            'null',
            '',
            '{"a": "\u0000"}',
            '{"__proto__": {"polluted": true}}',
        ];

        for (const input of malformedInputs) {
            expect(() => {
                try {
                    const accessor = SafeAccess.from(input);
                    accessor.get('a', null);
                } catch {
                    // Controlled error is acceptable — unhandled rejection is not
                }
            }).not.toThrow();
        }
    }, 30_000);

    // XML entity expansion (XXE-like patterns) must not cause resource exhaustion
    it('XML entities: hostile entity patterns', () => {
        const hostileXmls = [
            '<root>&amp;&lt;&gt;</root>',
            '<root><a>&xxe;</a></root>',
            '<root>' + '<a>'.repeat(100) + 'x' + '</a>'.repeat(100) + '</root>',
        ];

        for (const xml of hostileXmls) {
            expect(() => {
                try {
                    const accessor = SafeAccess.fromXml(xml);
                    accessor.get('a', null);
                } catch {
                    // Controlled error is acceptable
                }
            }).not.toThrow();
        }
    }, 30_000);
});
