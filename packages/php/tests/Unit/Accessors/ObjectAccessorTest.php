<?php

use SafeAccessInline\Accessors\ObjectAccessor;
use SafeAccessInline\Exceptions\InvalidFormatException;

describe(ObjectAccessor::class, function () {

    it('from — valid object', function () {
        $obj = (object) ['name' => 'Ana'];
        $accessor = ObjectAccessor::from($obj);
        expect($accessor)->toBeInstanceOf(ObjectAccessor::class);
    });

    it('from — invalid input throws', function () {
        ObjectAccessor::from('not an object');
    })->throws(InvalidFormatException::class);

    it('get — simple key', function () {
        $obj = (object) ['name' => 'Ana', 'age' => 30];
        $accessor = ObjectAccessor::from($obj);
        expect($accessor->get('name'))->toBe('Ana');
        expect($accessor->get('age'))->toBe(30);
    });

    it('get — nested key', function () {
        $obj = (object) ['user' => (object) ['profile' => (object) ['name' => 'Ana']]];
        $accessor = ObjectAccessor::from($obj);
        expect($accessor->get('user.profile.name'))->toBe('Ana');
    });

    it('get — nonexistent returns default', function () {
        $accessor = ObjectAccessor::from((object) ['a' => 1]);
        expect($accessor->get('x.y.z', 'default'))->toBe('default');
    });

    it('has — existing', function () {
        $accessor = ObjectAccessor::from((object) ['name' => 'Ana']);
        expect($accessor->has('name'))->toBeTrue();
    });

    it('has — nonexistent', function () {
        $accessor = ObjectAccessor::from((object) ['a' => 1]);
        expect($accessor->has('x.y'))->toBeFalse();
    });

    it('set — immutable', function () {
        $accessor = ObjectAccessor::from((object) ['name' => 'old']);
        $new = $accessor->set('name', 'new');
        expect($new->get('name'))->toBe('new');
        expect($accessor->get('name'))->toBe('old');
    });

    it('remove — existing', function () {
        $accessor = ObjectAccessor::from((object) ['a' => 1, 'b' => 2]);
        $new = $accessor->remove('b');
        expect($new->has('b'))->toBeFalse();
        expect($accessor->has('b'))->toBeTrue();
    });

    it('toArray', function () {
        $accessor = ObjectAccessor::from((object) ['name' => 'Ana']);
        expect($accessor->toArray())->toBe(['name' => 'Ana']);
    });

    it('toJson', function () {
        $accessor = ObjectAccessor::from((object) ['name' => 'Ana']);
        expect(json_decode($accessor->toJson(), true))->toBe(['name' => 'Ana']);
    });

    it('toObject', function () {
        $accessor = ObjectAccessor::from((object) ['name' => 'Ana']);
        $obj = $accessor->toObject();
        expect($obj->name)->toBe('Ana');
    });

    it('type', function () {
        $accessor = ObjectAccessor::from((object) ['name' => 'Ana', 'age' => 30]);
        expect($accessor->type('name'))->toBe('string');
        expect($accessor->type('age'))->toBe('integer');
        expect($accessor->type('missing'))->toBeNull();
    });

    it('count', function () {
        $accessor = ObjectAccessor::from((object) ['a' => 1, 'b' => 2]);
        expect($accessor->count())->toBe(2);
    });

    it('keys', function () {
        $accessor = ObjectAccessor::from((object) ['a' => 1, 'b' => 2]);
        expect($accessor->keys())->toBe(['a', 'b']);
    });

    it('handles empty object', function () {
        $accessor = ObjectAccessor::from((object) []);
        expect($accessor->toArray())->toBe([]);
        expect($accessor->count())->toBe(0);
    });

    it('getMany resolves multiple paths', function () {
        $accessor = ObjectAccessor::from((object) ['a' => 1, 'b' => 2]);
        $result = $accessor->getMany(['a' => null, 'missing' => 'default']);
        expect($result)->toBe(['a' => 1, 'missing' => 'default']);
    });

    it('throws InvalidFormatException when json_encode fails', function () {
        $obj = new \stdClass();
        $obj->self = $obj; // circular reference
        expect(fn () => ObjectAccessor::from($obj))->toThrow(InvalidFormatException::class);
    });

    it('returns empty array when json_decode result is not an array', function () {
        $obj = new class implements \JsonSerializable {
            public function jsonSerialize(): string
            {
                return 'scalar';
            }
        };
        $accessor = ObjectAccessor::from($obj);
        expect($accessor->toArray())->toBe([]);
    });

});
