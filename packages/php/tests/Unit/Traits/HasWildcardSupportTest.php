<?php

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

});
