/**
 * @testtype Cross-parity
 * @description Reads cases from packages/fixtures/cross-parity/cases.json and ensures
 *   that the JS implementation produces identical results for each one.
 *   If this test fails but the PHP side passes, the bug is in the JS implementation.
 *   If both sides fail, the fixture case itself may be wrong — review cases.json.
 *   Run: npx vitest run tests/cross-parity.test.ts
 */

import { describe, it, expect } from 'vitest';
import { SafeAccess } from '../src/safe-access';
import cases from '../../fixtures/cross-parity/cases.json';
import data from '../../fixtures/cross-parity/data.json';

describe('Cross-parity with PHP', () => {
    const accessor = SafeAccess.fromObject(data as Record<string, unknown>);

    for (const c of cases) {
        // Each case exercises a specific edge case documented in the fixture's description
        it(c.id, () => {
            const result = accessor.get(c.path, c.defaultValue);
            expect(result).toEqual(c.expected);
        });
    }
});
