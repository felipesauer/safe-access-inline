<?php

use SafeAccessInline\Core\DotNotationParser;
use SafeAccessInline\Core\PathCache;

describe(PathCache::class, function () {

    beforeEach(function () {
        PathCache::clear();
    });

    it('stores and retrieves segments', function () {
        $segments = [['type' => 'key', 'value' => 'a']];
        PathCache::set('a', $segments);
        expect(PathCache::get('a'))->toBe($segments);
    });

    it('returns null for missing keys', function () {
        expect(PathCache::get('missing'))->toBeNull();
    });

    it('reports has correctly', function () {
        expect(PathCache::has('a'))->toBeFalse();
        PathCache::set('a', []);
        expect(PathCache::has('a'))->toBeTrue();
    });

    it('tracks size', function () {
        expect(PathCache::size())->toBe(0);
        PathCache::set('a', []);
        expect(PathCache::size())->toBe(1);
        PathCache::set('b', []);
        expect(PathCache::size())->toBe(2);
    });

    it('clears all entries', function () {
        PathCache::set('a', []);
        PathCache::set('b', []);
        PathCache::clear();
        expect(PathCache::size())->toBe(0);
    });

    it('evicts oldest entry when exceeding max size', function () {
        for ($i = 0; $i < 1001; $i++) {
            PathCache::set("path_{$i}", [['type' => 'key', 'value' => (string) $i]]);
        }
        expect(PathCache::size())->toBe(1000);
        expect(PathCache::has('path_0'))->toBeFalse();
        expect(PathCache::has('path_1000'))->toBeTrue();
    });

    it('is used by DotNotationParser for repeated lookups', function () {
        PathCache::clear();
        $data = ['a' => ['b' => 1]];
        DotNotationParser::get($data, 'a.b');
        expect(PathCache::has('a.b'))->toBeTrue();
        $result = DotNotationParser::get($data, 'a.b');
        expect($result)->toBe(1);
    });
});
