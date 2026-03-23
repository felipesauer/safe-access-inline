<?php

declare(strict_types=1);

use SafeAccessInline\Core\AbstractAccessor;
use SafeAccessInline\SafeAccess;

describe(AbstractAccessor::class . ' - diff', function () {
    it('accepts an array directly', function () {
        $a = SafeAccess::fromArray(['a' => 1]);
        $ops = $a->diff(['a' => 2]);
        expect($ops)->toBeArray();
        expect($ops)->toHaveCount(1);
        expect($ops[0]->op)->toBe('replace');
        expect($ops[0]->value)->toBe(2);
    });
});
