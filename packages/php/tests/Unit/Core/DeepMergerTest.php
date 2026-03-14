<?php

use SafeAccessInline\Core\DeepMerger;
use SafeAccessInline\Exceptions\SecurityException;

describe(DeepMerger::class, function () {

    it('merges flat arrays', function () {
        $result = DeepMerger::merge(['a' => 1, 'b' => 2], ['b' => 3, 'c' => 4]);
        expect($result)->toBe(['a' => 1, 'b' => 3, 'c' => 4]);
    });

    it('merges nested arrays recursively', function () {
        $base = ['db' => ['host' => 'localhost', 'port' => 5432]];
        $override = ['db' => ['port' => 3306, 'name' => 'mydb']];
        expect(DeepMerger::merge($base, $override))->toBe([
            'db' => ['host' => 'localhost', 'port' => 3306, 'name' => 'mydb'],
        ]);
    });

    it('replaces indexed arrays (last wins)', function () {
        $base = ['items' => [1, 2, 3]];
        $override = ['items' => [4, 5]];
        expect(DeepMerger::merge($base, $override))->toBe(['items' => [4, 5]]);
    });

    it('supports multiple overrides', function () {
        $result = DeepMerger::merge(
            ['a' => 1, 'b' => 2],
            ['b' => 3, 'c' => 4],
            ['c' => 5, 'd' => 6],
        );
        expect($result)->toBe(['a' => 1, 'b' => 3, 'c' => 5, 'd' => 6]);
    });

    it('does not mutate original arrays', function () {
        $base = ['a' => ['b' => 1]];
        $baseCopy = $base;
        DeepMerger::merge($base, ['a' => ['c' => 2]]);
        expect($base)->toBe($baseCopy);
    });

    it('handles deep nesting', function () {
        $result = DeepMerger::merge(
            ['a' => ['b' => ['c' => ['d' => 1]]]],
            ['a' => ['b' => ['c' => ['e' => 2]]]],
        );
        expect($result)->toBe(['a' => ['b' => ['c' => ['d' => 1, 'e' => 2]]]]);
    });

    it('rejects prototype pollution keys', function () {
        DeepMerger::merge([], ['__proto__' => ['hacked' => true]]);
    })->throws(SecurityException::class);

    it('merges with no overrides', function () {
        expect(DeepMerger::merge(['a' => 1]))->toBe(['a' => 1]);
    });

    it('handles null values in override', function () {
        $result = DeepMerger::merge(['a' => ['b' => 1]], ['a' => null]);
        expect($result['a'])->toBeNull();
    });
});
