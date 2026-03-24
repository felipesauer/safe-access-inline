/**
 * @testtype Benchmark
 * @description Measures throughput for end-to-end SafeAccess operations (parse + query).
 *   Complements dot-notation.bench.ts which benchmarks the parser in isolation.
 *   Does NOT fail CI — serves as a reference report between versions.
 *   Run: npx vitest bench
 *   Results saved in: bench-results.json
 */

import { bench, describe } from 'vitest';
import { SafeAccess } from '../src/safe-access';
import { deepMerge } from '../src/core/operations/deep-merger';

const flatObject = Object.fromEntries(
    Array.from({ length: 1000 }, (_, i) => [`key${i}`, `value${i}`]),
);

const largeArray = {
    items: Array.from({ length: 10_000 }, (_, i) => ({
        id: i,
        name: `item-${i}`,
        price: Math.round(Math.random() * 100),
        active: i % 2 === 0,
    })),
};

const deepObject = Array.from({ length: 100 }).reduceRight<Record<string, unknown>>(
    (inner, _, i) => ({ [`level${i}`]: inner }),
    { value: 'deep' },
);

const mergeBase = Object.fromEntries(
    Array.from({ length: 1000 }, (_, i) => [`key${i}`, { nested: i }]),
);
const mergeOverlay = Object.fromEntries(
    Array.from({ length: 1000 }, (_, i) => [`key${i}`, { nested: i * 2, extra: true }]),
);

describe('SafeAccess end-to-end', () => {
    // Baseline — parse JSON + simple accessor, no wildcards
    bench('parse JSON + simple access (flat 1000 keys)', () => {
        const accessor = SafeAccess.fromObject(flatObject);
        accessor.get('key500');
    });

    // Wildcard is the most common advanced operation
    bench('wildcard on 10,000-item array', () => {
        const accessor = SafeAccess.fromObject(largeArray);
        accessor.get('items.*.name');
    });

    // Filter is O(n) — measure cost with large array
    bench('filter [?price>50] on 10,000 items', () => {
        const accessor = SafeAccess.fromObject(largeArray);
        accessor.get('items[?price>50].name');
    });

    // Deep path tests recursion/iteration overhead
    bench('100-level deep path', () => {
        const path = Array.from({ length: 100 }, (_, i) => `level${i}`).join('.') + '.value';
        const accessor = SafeAccess.fromObject(deepObject);
        accessor.get(path);
    });

    // Deep merge is the most expensive operation — separate budget
    bench('deep merge of two 1000-key objects', () => {
        deepMerge(mergeBase, mergeOverlay);
    });
});
