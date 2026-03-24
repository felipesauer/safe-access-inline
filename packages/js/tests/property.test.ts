/**
 * @testtype Property-based
 * @description Generates hundreds of random inputs to validate universal invariants.
 *   Unlike example-based tests, the specific value doesn't matter — what matters is
 *   that the PROPERTY is always true regardless of input.
 *   Run: npx vitest run tests/property.test.ts
 *   On failure, fast-check displays the smallest reproducing input (shrinking).
 */

import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import { SafeAccess } from '../src/safe-access';
import { DotNotationParser } from '../src/core/parsers/dot-notation-parser';
import { SecurityError } from '../src/exceptions/security.error';

describe('Property-based invariants', () => {
    // No path should ever crash the library — security above all else.
    // SecurityError is an intentional, controlled rejection (prototype-pollution guard)
    // and must NOT be treated as a crash. Any other error type is a bug.
    it('safety: no path makes the library throw', () => {
        fc.assert(
            fc.property(fc.string(), fc.anything(), (path, data) => {
                try {
                    DotNotationParser.get(data as Record<string, unknown>, path, null);
                } catch (e) {
                    // Intentional security rejections are expected — propagate any other error
                    if (!(e instanceof SecurityError)) {
                        throw e;
                    }
                }
            }),
            { numRuns: 200 },
        );
    }, 30_000);

    // The default is the user's safety net — it must always be honored.
    // Note: the library normalises undefined → null internally, so undefined defaults are excluded.
    it('default is always returned when path does not exist', () => {
        fc.assert(
            fc.property(
                fc.anything().filter((v) => v !== undefined),
                (defaultVal) => {
                    const result = DotNotationParser.get({}, '__nonexistent__', defaultVal);
                    expect(result).toBe(defaultVal);
                },
            ),
            { numRuns: 200 },
        );
    }, 30_000);

    // get(obj, key) should be equivalent to obj[key] for simple single-segment keys.
    // Only identifier-safe characters are tested — parser syntax characters ($, [, ], ., *, ..)
    // are intentionally reserved as query operators and excluded from plain-key tests.
    it('idempotence: simple key access matches direct property access', () => {
        fc.assert(
            fc.property(
                fc.stringMatching(/^[a-zA-Z_][a-zA-Z0-9_-]*$/),
                fc.anything().filter((v) => v !== undefined),
                (key, value) => {
                    const obj: Record<string, unknown> = { [key]: value };
                    expect(DotNotationParser.get(obj, key)).toEqual(value);
                },
            ),
            { numRuns: 200 },
        );
    }, 30_000);

    // Wildcard on arrays must never return undefined — at minimum an empty array
    it('wildcards always return an array, never undefined', () => {
        fc.assert(
            fc.property(fc.array(fc.record({ price: fc.float() })), (items) => {
                const accessor = SafeAccess.fromObject({ items });
                const result = accessor.get('items.*.price');
                expect(Array.isArray(result)).toBe(true);
            }),
            { numRuns: 200 },
        );
    }, 30_000);
});
