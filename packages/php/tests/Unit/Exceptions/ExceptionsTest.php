<?php

use SafeAccessInline\Exceptions\AccessorException;
use SafeAccessInline\Exceptions\InvalidFormatException;
use SafeAccessInline\Exceptions\PathNotFoundException;
use SafeAccessInline\Exceptions\UnsupportedTypeException;

describe('Exceptions', function () {

    it('PathNotFoundException can be instantiated', function () {
        $e = new PathNotFoundException('path not found');
        expect($e)->toBeInstanceOf(PathNotFoundException::class);
        expect($e)->toBeInstanceOf(AccessorException::class);
        expect($e)->toBeInstanceOf(\RuntimeException::class);
        expect($e->getMessage())->toBe('path not found');
    });

    it('InvalidFormatException can be instantiated', function () {
        $e = new InvalidFormatException('invalid format');
        expect($e)->toBeInstanceOf(InvalidFormatException::class);
        expect($e)->toBeInstanceOf(AccessorException::class);
    });

    it('UnsupportedTypeException can be instantiated', function () {
        $e = new UnsupportedTypeException('unsupported type');
        expect($e)->toBeInstanceOf(UnsupportedTypeException::class);
        expect($e)->toBeInstanceOf(AccessorException::class);
    });

});
