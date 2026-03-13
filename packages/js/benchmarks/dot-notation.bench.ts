import { bench, describe } from 'vitest';
import { DotNotationParser } from '../src/core/dot-notation-parser';

const shallow = { a: 1, b: 2, c: 3 };
const nested = {
    level1: {
        level2: {
            level3: {
                level4: { value: 'deep' },
            },
        },
    },
};

const array100 = {
    items: Array.from({ length: 100 }, (_, i) => ({
        id: i,
        name: `item-${i}`,
        active: i % 2 === 0,
        price: i * 10,
    })),
};

describe('DotNotationParser.get', () => {
    bench('shallow key', () => {
        DotNotationParser.get(shallow, 'a');
    });

    bench('4-level deep key', () => {
        DotNotationParser.get(nested, 'level1.level2.level3.level4.value');
    });

    bench('wildcard 100 items', () => {
        DotNotationParser.get(array100, 'items.*.name');
    });

    bench('filter 100 items (active==true)', () => {
        DotNotationParser.get(array100, 'items[?active==true].name');
    });

    bench('filter 100 items (price>500)', () => {
        DotNotationParser.get(array100, 'items[?price>500].name');
    });

    bench('missing key (default)', () => {
        DotNotationParser.get(shallow, 'x.y.z', 'fallback');
    });
});

describe('DotNotationParser.set', () => {
    bench('set shallow key', () => {
        DotNotationParser.set(shallow, 'd', 4);
    });

    bench('set 4-level deep key', () => {
        DotNotationParser.set(nested, 'level1.level2.level3.level4.newKey', 'val');
    });
});

describe('DotNotationParser.merge', () => {
    bench('merge at root', () => {
        DotNotationParser.merge(shallow, '', { d: 4, e: 5 });
    });

    bench('merge at deep path', () => {
        DotNotationParser.merge(nested, 'level1.level2', { extra: true });
    });
});

describe('DotNotationParser.has', () => {
    bench('has — existing deep key', () => {
        DotNotationParser.has(nested, 'level1.level2.level3.level4.value');
    });

    bench('has — missing key', () => {
        DotNotationParser.has(shallow, 'x.y.z');
    });
});
