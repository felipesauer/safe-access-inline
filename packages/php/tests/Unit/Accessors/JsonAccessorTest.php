<?php

use SafeAccessInline\Accessors\JsonAccessor;
use SafeAccessInline\Exceptions\InvalidFormatException;

describe(JsonAccessor::class, function () {

    it('from — valid JSON string', function () {
        $accessor = JsonAccessor::from('{"name": "Ana"}');
        expect($accessor)->toBeInstanceOf(JsonAccessor::class);
    });

    it('from — invalid type throws', function () {
        JsonAccessor::from(123);
    })->throws(InvalidFormatException::class);

    it('from — invalid JSON throws', function () {
        JsonAccessor::from('{invalid json}');
    })->throws(InvalidFormatException::class);

    it('get — simple key', function () {
        $accessor = JsonAccessor::from('{"name": "Ana", "age": 30}');
        expect($accessor->get('name'))->toBe('Ana');
        expect($accessor->get('age'))->toBe(30);
    });

    it('get — nested', function () {
        $accessor = JsonAccessor::from('{"user": {"profile": {"name": "Ana"}}}');
        expect($accessor->get('user.profile.name'))->toBe('Ana');
    });

    it('get — nonexistent returns default', function () {
        $accessor = JsonAccessor::from('{"a": 1}');
        expect($accessor->get('x.y', 'fallback'))->toBe('fallback');
    });

    it('get — numeric index', function () {
        $accessor = JsonAccessor::from('{"items": [{"title": "A"}, {"title": "B"}]}');
        expect($accessor->get('items.0.title'))->toBe('A');
        expect($accessor->get('items.1.title'))->toBe('B');
    });

    it('get — wildcard', function () {
        $accessor = JsonAccessor::from('{"users": [{"name": "Ana"}, {"name": "Bob"}]}');
        expect($accessor->get('users.*.name'))->toBe(['Ana', 'Bob']);
    });

    it('has — existing', function () {
        $accessor = JsonAccessor::from('{"key": "value"}');
        expect($accessor->has('key'))->toBeTrue();
    });

    it('has — nonexistent', function () {
        $accessor = JsonAccessor::from('{"key": "value"}');
        expect($accessor->has('missing'))->toBeFalse();
    });

    it('set — immutable', function () {
        $accessor = JsonAccessor::from('{"name": "old"}');
        $new = $accessor->set('name', 'new');
        expect($new->get('name'))->toBe('new');
        expect($accessor->get('name'))->toBe('old');
    });

    it('remove — existing', function () {
        $accessor = JsonAccessor::from('{"a": 1, "b": 2}');
        $new = $accessor->remove('b');
        expect($new->has('b'))->toBeFalse();
    });

    it('toArray', function () {
        $accessor = JsonAccessor::from('{"name": "Ana"}');
        expect($accessor->toArray())->toBe(['name' => 'Ana']);
    });

    it('toJson', function () {
        $accessor = JsonAccessor::from('{"name": "Ana"}');
        expect(json_decode($accessor->toJson(), true))->toBe(['name' => 'Ana']);
    });

    it('toObject', function () {
        $accessor = JsonAccessor::from('{"name": "Ana"}');
        $obj = $accessor->toObject();
        expect($obj->name)->toBe('Ana');
    });

    it('type', function () {
        $accessor = JsonAccessor::from('{"s": "str", "n": 42, "b": true, "a": [1]}');
        expect($accessor->type('s'))->toBe('string');
        expect($accessor->type('n'))->toBe('integer');
        expect($accessor->type('b'))->toBe('boolean');
        expect($accessor->type('a'))->toBe('array');
        expect($accessor->type('missing'))->toBeNull();
    });

    it('count and keys', function () {
        $accessor = JsonAccessor::from('{"a": 1, "b": 2, "c": 3}');
        expect($accessor->count())->toBe(3);
        expect($accessor->keys())->toBe(['a', 'b', 'c']);
    });

});
