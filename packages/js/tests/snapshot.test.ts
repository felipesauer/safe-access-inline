/**
 * @testtype Snapshot
 * @description Freezes outputs of complex queries (recursive wildcards, nested filters,
 *   deep merge). Any unexpected output change breaks the test, forcing a conscious review
 *   via `vitest run --update`.
 *   Run: npx vitest run tests/snapshot.test.ts
 */

import { describe, it, expect } from 'vitest';
import { SafeAccess } from '../src/safe-access';

// 4-level nested data for recursive descent tests
const deepData = {
    a: {
        name: 'a1',
        b: {
            name: 'b1',
            c: {
                name: 'c1',
                d: {
                    name: 'd1',
                    value: 42,
                },
            },
        },
    },
    items: [
        { name: 'item1', sub: { name: 'sub1', score: 10 } },
        { name: 'item2', sub: { name: 'sub2', score: 30 } },
    ],
};

describe('Snapshot — complex query outputs', () => {
    const accessor = SafeAccess.fromObject(deepData);

    // Recursive descent collects ALL occurrences of a key at every depth level
    it('recursive wildcard (..) on 4-level nested object', () => {
        const result = accessor.get('..name');
        expect(result).toMatchSnapshot();
    });

    // Combined filter + wildcard tests the interaction between two resolution strategies
    it('filter combined with wildcard: items[?sub.score>15].sub.name', () => {
        const result = accessor.get('items[?sub.score>15].sub.name');
        expect(result).toMatchSnapshot();
    });

    // Wildcard on nested array structures must return the full inner structure
    it('array wildcard returning nested structure', () => {
        const result = accessor.get('items.*.sub');
        expect(result).toMatchSnapshot();
    });
});
