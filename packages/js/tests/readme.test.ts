/**
 * @testtype README Examples
 * @description Ensures that all public examples from the README continue working.
 *   If any test here fails, the public API broke or the documentation is outdated.
 *   Run: npx vitest run tests/readme.test.ts
 */

import { describe, it, expect } from 'vitest';
import { SafeAccess } from '../src/safe-access';

describe('README examples', () => {
    const accessor = SafeAccess.from(
        '{"user": {"name": "Ana"}, "items": [{"price": 10}, {"price": 50}]}',
    );

    // Verifies simple dot-notation access — the first thing a user sees in the README
    it('get user.name returns "Ana"', () => {
        expect(accessor.get('user.name')).toBe('Ana');
    });

    // Default value is the safety net advertised prominently — must never throw
    it('get user.email with default returns "N/A"', () => {
        expect(accessor.get('user.email', 'N/A')).toBe('N/A');
    });

    // Wildcard is the headline feature — collects values from all array elements
    it('get items.*.price returns [10, 50]', () => {
        expect(accessor.get('items.*.price')).toEqual([10, 50]);
    });

    // Filter expression is the advanced query feature shown in the README
    it('get items[?price>20].price returns [50]', () => {
        expect(accessor.get('items[?price>20].price')).toEqual([50]);
    });

    // Recursive descent (..) is the last example in the Quick Example section
    it('get ..name returns ["Ana"]', () => {
        expect(accessor.get('..name')).toEqual(['Ana']);
    });
});
