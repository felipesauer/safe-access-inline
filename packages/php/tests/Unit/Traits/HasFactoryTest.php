<?php

use SafeAccessInline\Accessors\ArrayAccessor;
use SafeAccessInline\Traits\HasFactory;

describe(HasFactory::class, function () {

    it('creates instance via make()', function () {
        $accessor = ArrayAccessor::make(['name' => 'Ana']);
        expect($accessor)->toBeInstanceOf(ArrayAccessor::class);
        expect($accessor->get('name'))->toBe('Ana');
    });

});
