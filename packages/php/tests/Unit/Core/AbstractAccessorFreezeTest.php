<?php

declare(strict_types=1);

use SafeAccessInline\Core\AbstractAccessor;
use SafeAccessInline\Exceptions\ReadonlyViolationException;
use SafeAccessInline\SafeAccess;

describe(AbstractAccessor::class . ' - freeze', function () {
    it('returns a frozen copy of the accessor', function () {
        $accessor = SafeAccess::fromArray(['a' => 1]);
        $frozen = $accessor->freeze();

        expect($frozen->get('a'))->toBe(1);

        $thrown = false;
        try {
            $frozen->set('a', 2);
        } catch (ReadonlyViolationException $e) {
            $thrown = true;
        }
        expect($thrown)->toBeTrue();

        // original is untouched and mutable — set() returns a new accessor (immutable pattern)
        $updated = $accessor->set('a', 2);
        expect($updated->get('a'))->toBe(2);
        // original is unchanged
        expect($accessor->get('a'))->toBe(1);
    });
});
