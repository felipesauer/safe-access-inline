<?php

declare(strict_types=1);

use SafeAccessInline\Accessors\ArrayAccessor;
use SafeAccessInline\Traits\HasWildcardSupport;

describe(HasWildcardSupport::class, function () {

    it('returns array of matching values for wildcard path', function () {
        $accessor = ArrayAccessor::from([
            'users' => [
                ['name' => 'Ana'],
                ['name' => 'Bob'],
            ],
        ]);
        $result = $accessor->getWildcard('users.*.name');
        expect($result)->toBe(['Ana', 'Bob']);
    });

    it('wraps non-array result in array', function () {
        $accessor = ArrayAccessor::from(['name' => 'Ana']);
        $result = $accessor->getWildcard('name');
        expect($result)->toBe(['Ana']);
    });

    // ── C1: Associative-array-as-collection ──────────────────────────

    it('wildcard on associative-array-as-collection collects scalar values (mirrors JS Object.values)', function () {
        // PHP uses array_values() internally — string keys are stripped and every
        // entry is iterated, exactly mirroring JS's `Object.values()` behaviour.
        $accessor = ArrayAccessor::from([
            'departments' => [
                'eng'  => ['head' => 'Alice', 'size' => 10],
                'mktg' => ['head' => 'Bob',   'size' => 5],
                'ops'  => ['head' => 'Carol',  'size' => 8],
            ],
        ]);

        expect($accessor->getWildcard('departments.*.head'))->toBe(['Alice', 'Bob', 'Carol']);
    });

    it('wildcard on associative-array-as-collection \u2014 numeric field', function () {
        $accessor = ArrayAccessor::from([
            'departments' => [
                'eng'  => ['head' => 'Alice', 'size' => 10],
                'mktg' => ['head' => 'Bob',   'size' => 5],
                'ops'  => ['head' => 'Carol',  'size' => 8],
            ],
        ]);

        expect($accessor->getWildcard('departments.*.size'))->toBe([10, 5, 8]);
    });

});
