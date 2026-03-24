<?php

declare(strict_types=1);

use SafeAccessInline\Accessors\ArrayAccessor;
use SafeAccessInline\Exceptions\InvalidFormatException;

describe(ArrayAccessor::class, function () {

    it('from — valid array', function () {
        $accessor = ArrayAccessor::from(['name' => 'Ana']);
        expect($accessor)->toBeInstanceOf(ArrayAccessor::class);
    });

    it('from — invalid input throws', function () {
        ArrayAccessor::from('not an array');
    })->throws(InvalidFormatException::class);

    it('get — simple key', function () {
        $accessor = ArrayAccessor::from(['name' => 'Ana', 'age' => 30]);
        expect($accessor->get('name'))->toBe('Ana');
        expect($accessor->get('age'))->toBe(30);
    });

    it('get — nested key', function () {
        $accessor = ArrayAccessor::from(['user' => ['profile' => ['name' => 'Ana']]]);
        expect($accessor->get('user.profile.name'))->toBe('Ana');
    });

    it('get — nonexistent returns default', function () {
        $accessor = ArrayAccessor::from(['a' => 1]);
        expect($accessor->get('x.y.z', 'default'))->toBe('default');
    });

    it('get — numeric index', function () {
        $accessor = ArrayAccessor::from(['items' => [['title' => 'First'], ['title' => 'Second']]]);
        expect($accessor->get('items.0.title'))->toBe('First');
    });

    it('get — wildcard', function () {
        $accessor = ArrayAccessor::from(['users' => [['name' => 'Ana'], ['name' => 'Bob']]]);
        expect($accessor->get('users.*.name'))->toBe(['Ana', 'Bob']);
    });

    it('get — escaped dot', function () {
        $accessor = ArrayAccessor::from(['config.db' => ['host' => 'localhost']]);
        expect($accessor->get('config\.db.host'))->toBe('localhost');
    });

    it('get — empty path returns default', function () {
        $accessor = ArrayAccessor::from(['a' => 1]);
        expect($accessor->get('', 'default'))->toBe('default');
    });

    it('has — existing', function () {
        $accessor = ArrayAccessor::from(['user' => ['name' => 'Ana']]);
        expect($accessor->has('user.name'))->toBeTrue();
    });

    it('has — nonexistent', function () {
        $accessor = ArrayAccessor::from(['a' => 1]);
        expect($accessor->has('x.y'))->toBeFalse();
    });

    it('set — new path returns new instance', function () {
        $accessor = ArrayAccessor::from(['a' => 1]);
        $new = $accessor->set('b.c', 'value');
        expect($new->get('b.c'))->toBe('value');
        expect($accessor->has('b'))->toBeFalse(); // immutability
    });

    it('set — overwrite returns new instance', function () {
        $accessor = ArrayAccessor::from(['name' => 'old']);
        $new = $accessor->set('name', 'new');
        expect($new->get('name'))->toBe('new');
        expect($accessor->get('name'))->toBe('old');
    });

    it('remove — existing path', function () {
        $accessor = ArrayAccessor::from(['a' => 1, 'b' => 2]);
        $new = $accessor->remove('b');
        expect($new->has('b'))->toBeFalse();
        expect($accessor->has('b'))->toBeTrue(); // immutability
    });

    it('remove — nonexistent path returns equivalent instance', function () {
        $accessor = ArrayAccessor::from(['a' => 1]);
        $new = $accessor->remove('x.y');
        expect($new->all())->toBe(['a' => 1]);
    });

    it('type — returns correct types', function () {
        $accessor = ArrayAccessor::from([
            'name' => 'Ana',
            'age' => 30,
            'active' => true,
            'items' => [1, 2],
        ]);
        expect($accessor->type('name'))->toBe('string');
        expect($accessor->type('age'))->toBe('number');
        expect($accessor->type('active'))->toBe('boolean');
        expect($accessor->type('items'))->toBe('array');
        expect($accessor->type('missing'))->toBeNull();
    });

    it('type — returns number for float and null for null', function () {
        $accessor = ArrayAccessor::from(['price' => 9.99, 'empty' => null]);
        expect($accessor->type('price'))->toBe('number');
        expect($accessor->type('empty'))->toBe('null');
    });

    it('count — root and sub-path', function () {
        $accessor = ArrayAccessor::from(['a' => 1, 'b' => 2, 'items' => [1, 2, 3]]);
        expect($accessor->count())->toBe(3);
        expect($accessor->count('items'))->toBe(3);
    });

    it('keys — root and sub-path', function () {
        $accessor = ArrayAccessor::from(['name' => 'Ana', 'user' => ['a' => 1, 'b' => 2]]);
        expect($accessor->keys())->toBe(['name', 'user']);
        expect($accessor->keys('user'))->toBe(['a', 'b']);
    });

    it('toArray — returns data', function () {
        $data = ['a' => 1, 'b' => ['c' => 2]];
        $accessor = ArrayAccessor::from($data);
        expect($accessor->toArray())->toBe($data);
    });

    it('toJson — returns valid JSON', function () {
        $accessor = ArrayAccessor::from(['name' => 'Ana']);
        $json = $accessor->toJson();
        expect(json_decode($json, true))->toBe(['name' => 'Ana']);
    });

    it('all — returns all data', function () {
        $data = ['x' => 1, 'y' => 2];
        $accessor = ArrayAccessor::from($data);
        expect($accessor->all())->toBe($data);
    });

    it('getMany — multiple paths', function () {
        $accessor = ArrayAccessor::from(['a' => 1, 'b' => 2, 'c' => 3]);
        $result = $accessor->getMany(['a' => null, 'b' => null, 'missing' => 'default']);
        expect($result)->toBe(['a' => 1, 'b' => 2, 'missing' => 'default']);
    });

});
