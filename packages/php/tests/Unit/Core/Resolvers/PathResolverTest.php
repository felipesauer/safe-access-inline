<?php

use SafeAccessInline\Core\Resolvers\PathResolver;
use SafeAccessInline\Enums\SegmentType;
use SafeAccessInline\Exceptions\SecurityException;

describe(PathResolver::class, function () {

    // ── resolve — recursion depth guard ────────────────────────────────

    it('resolve — throws SecurityException when index exceeds maxDepth (line 35)', function () {
        // index (3) > maxDepth (2) triggers the depth-guard throw on line 35.
        PathResolver::resolve(['a' => 1], [['type' => SegmentType::KEY, 'value' => 'a']], 3, null, 2);
    })->throws(SecurityException::class, 'Recursion depth');

    // ── MULTI_INDEX — string-key mode: missing key returns default ──────

    it('MULTI_INDEX string-keys — missing key returns configured default', function () {
        $data = ['a' => 1, 'c' => 3];
        $segments = [
            ['type' => SegmentType::MULTI_INDEX, 'keys' => ['a', 'b', 'c']],
        ];

        $result = PathResolver::resolve($data, $segments, 0, 'MISSING', 50);

        expect($result)->toBe([1, 'MISSING', 3]);
    });

    it('MULTI_INDEX — returns default when current is not an array (line 96)', function () {
        // Non-array current hits the `!is_array($current)` guard returning $default.
        $segments = [['type' => SegmentType::MULTI_INDEX, 'indices' => [0, 1]]];

        $result = PathResolver::resolve('scalar', $segments, 0, 'DEFAULT', 50);

        expect($result)->toBe('DEFAULT');
    });

    it('MULTI_INDEX string-keys — resolves further segments when nextIndex < segmentCount (line 109)', function () {
        // Two segments: MULTI_INDEX(keys) then KEY('id').
        // Because nextIndex (1) < segmentCount (2), self::resolve() is called (line 109).
        $data = ['a' => ['id' => 1], 'b' => ['id' => 2]];
        $segments = [
            ['type' => SegmentType::MULTI_INDEX, 'keys' => ['a', 'b']],
            ['type' => SegmentType::KEY, 'value' => 'id'],
        ];

        $result = PathResolver::resolve($data, $segments, 0, null, 50);

        expect($result)->toBe([1, 2]);
    });

    // ── SLICE — various edge cases ──────────────────────────────────────

    it('SLICE with negative step returns elements in reverse order', function () {
        $data = ['a', 'b', 'c', 'd', 'e'];
        $segments = [
            ['type' => SegmentType::SLICE, 'start' => 3, 'end' => 0, 'step' => -1],
        ];

        $result = PathResolver::resolve($data, $segments, 0, null, 50);

        expect($result)->toBe(['d', 'c', 'b']);
    });

    it('SLICE — returns default when current is not an array (line 131)', function () {
        $segments = [['type' => SegmentType::SLICE, 'start' => 0, 'end' => 2, 'step' => 1]];

        $result = PathResolver::resolve('scalar', $segments, 0, 'DEFAULT', 50);

        expect($result)->toBe('DEFAULT');
    });

    it('SLICE — normalises negative end (line 142)', function () {
        // end=-1 → $end = len + (-1) = 4; [0:-1] on ['a','b','c','d','e'] → ['a','b','c','d']
        $data = ['a', 'b', 'c', 'd', 'e'];
        $segments = [
            ['type' => SegmentType::SLICE, 'start' => 0, 'end' => -1, 'step' => 1],
        ];

        $result = PathResolver::resolve($data, $segments, 0, null, 50);

        expect($result)->toBe(['a', 'b', 'c', 'd']);
    });

    it('SLICE — clamps start to len when start >= len (line 145)', function () {
        // start=10 >= len=3 → start is clamped to 3; no iterations → empty slice.
        $data = ['x', 'y', 'z'];
        $segments = [
            ['type' => SegmentType::SLICE, 'start' => 10, 'end' => 15, 'step' => 1],
        ];

        $result = PathResolver::resolve($data, $segments, 0, null, 50);

        expect($result)->toBe([]);
    });

    // ── collectDescent — scalar current and assoc resolved value ───────

    it('collectDescent — returns empty array when current is scalar (line 207)', function () {
        // resolveDescent passes a scalar to collectDescent; line 207 (early return)
        // is exercised, leaving $results empty → resolve returns [].
        $segments = [['type' => SegmentType::DESCENT, 'key' => 'name']];

        $result = PathResolver::resolve('scalar', $segments, 0, null, 50);

        expect($result)->toBe([]);
    });

    it('collectDescent spreads list results when further segments are present', function () {
        $data = [
            'tags' => ['alpha', 'beta'],
            'child' => [
                'tags' => ['gamma', 'delta'],
            ],
        ];
        // DESCENT('tags') followed by WILDCARD — the wildcard resolves each tags
        // value to a list, triggering array_push($results, ...$resolved).
        $segments = [
            ['type' => SegmentType::DESCENT, 'key' => 'tags'],
            ['type' => SegmentType::WILDCARD],
        ];

        $result = PathResolver::resolve($data, $segments, 0, null, 50);

        expect($result)->toBe(['alpha', 'beta', 'gamma', 'delta']);
    });

    it('collectDescent — stores assoc resolved value directly (line 218)', function () {
        // resolve() returns a non-list assoc array; the `else` branch stores it
        // directly with $results[] = $resolved (line 218).
        $data = ['org' => ['members' => ['first' => 'Alice', 'last' => 'Bob']]];
        $segments = [
            ['type' => SegmentType::DESCENT, 'key' => 'members'],
            ['type' => SegmentType::KEY, 'value' => 'first'],
        ];

        $result = PathResolver::resolve($data, $segments, 0, null, 50);

        expect($result)->toBe(['Alice']);
    });
});
