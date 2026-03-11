<?php

use SafeAccessInline\Accessors\EnvAccessor;
use SafeAccessInline\Exceptions\InvalidFormatException;

describe(EnvAccessor::class, function () {

    it('from — valid ENV string', function () {
        $accessor = EnvAccessor::from("APP_KEY=secret\nDEBUG=true");
        expect($accessor)->toBeInstanceOf(EnvAccessor::class);
    });

    it('from — invalid type throws', function () {
        EnvAccessor::from(123);
    })->throws(InvalidFormatException::class);

    it('get — simple key', function () {
        $accessor = EnvAccessor::from("APP_KEY=secret\nDEBUG=true");
        expect($accessor->get('APP_KEY'))->toBe('secret');
        expect($accessor->get('DEBUG'))->toBe('true');
    });

    it('get — nonexistent returns default', function () {
        $accessor = EnvAccessor::from("KEY=value");
        expect($accessor->get('MISSING', 'default'))->toBe('default');
    });

    it('supports comments', function () {
        $accessor = EnvAccessor::from("# this is a comment\nKEY=value");
        expect($accessor->get('KEY'))->toBe('value');
        expect($accessor->has('#'))->toBeFalse();
    });

    it('supports quoted values', function () {
        $accessor = EnvAccessor::from("KEY1=\"quoted value\"\nKEY2='single quoted'");
        expect($accessor->get('KEY1'))->toBe('quoted value');
        expect($accessor->get('KEY2'))->toBe('single quoted');
    });

    it('ignores blank lines', function () {
        $accessor = EnvAccessor::from("A=1\n\n\nB=2");
        expect($accessor->get('A'))->toBe('1');
        expect($accessor->get('B'))->toBe('2');
    });

    it('has — existing', function () {
        $accessor = EnvAccessor::from("KEY=value");
        expect($accessor->has('KEY'))->toBeTrue();
    });

    it('has — nonexistent', function () {
        $accessor = EnvAccessor::from("KEY=value");
        expect($accessor->has('MISSING'))->toBeFalse();
    });

    it('set — immutable', function () {
        $accessor = EnvAccessor::from("KEY=old");
        $new = $accessor->set('KEY', 'new');
        expect($new->get('KEY'))->toBe('new');
        expect($accessor->get('KEY'))->toBe('old');
    });

    it('remove — existing', function () {
        $accessor = EnvAccessor::from("A=1\nB=2");
        $new = $accessor->remove('B');
        expect($new->has('B'))->toBeFalse();
        expect($accessor->has('B'))->toBeTrue();
    });

    it('count and keys', function () {
        $accessor = EnvAccessor::from("A=1\nB=2\nC=3");
        expect($accessor->count())->toBe(3);
        expect($accessor->keys())->toBe(['A', 'B', 'C']);
    });

    it('toArray', function () {
        $accessor = EnvAccessor::from("A=1\nB=2");
        expect($accessor->toArray())->toBe(['A' => '1', 'B' => '2']);
    });

    it('toJson', function () {
        $accessor = EnvAccessor::from("KEY=value");
        expect(json_decode($accessor->toJson(), true))->toBe(['KEY' => 'value']);
    });

});
