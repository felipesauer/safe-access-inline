<?php

declare(strict_types=1);

use SafeAccessInline\Accessors\ObjectAccessor;
use SafeAccessInline\Core\AbstractAccessor;

describe(AbstractAccessor::class, function (): void {
    describe('getTemplate — @path bindings', function (): void {

        it('resolves @path binding to a string value from data', function (): void {
            $accessor = ObjectAccessor::from((object) [
                'key'  => 'name',
                'user' => ['name' => 'Ana', 'age' => 25],
            ]);
            expect($accessor->getTemplate('user.{field}', ['field' => '@key']))->toBe('Ana');
        });

        it('resolves @path binding that returns an integer', function (): void {
            $accessor = ObjectAccessor::from((object) [
                'idx'   => 1,
                'items' => [['label' => 'zero'], ['label' => 'one']],
            ]);
            expect($accessor->getTemplate('items.{i}.label', ['i' => '@idx']))->toBe('one');
        });

        it('resolves nested @path binding', function (): void {
            $accessor = ObjectAccessor::from((object) [
                'meta'  => ['userId' => '42'],
                'users' => ['42' => ['name' => 'Bob']],
            ]);
            expect($accessor->getTemplate('users.{id}.name', ['id' => '@meta.userId']))->toBe('Bob');
        });

        it('returns default when @path binding resolves to null', function (): void {
            $accessor = ObjectAccessor::from((object) ['user' => ['name' => 'Ana']]);
            expect(
                $accessor->getTemplate('user.{field}', ['field' => '@missing'], 'fallback')
            )->toBe('fallback');
        });

        it('non-@ bindings pass through unchanged', function (): void {
            $accessor = ObjectAccessor::from((object) ['users' => ['1' => ['name' => 'Bob']]]);
            expect($accessor->getTemplate('users.{id}.name', ['id' => '1']))->toBe('Bob');
        });

        it('mixed @path and literal bindings resolve correctly', function (): void {
            $accessor = ObjectAccessor::from((object) [
                'section' => 'db',
                'config'  => ['db' => ['host' => 'localhost']],
            ]);
            expect(
                $accessor->getTemplate('config.{s}.{f}', ['s' => '@section', 'f' => 'host'])
            )->toBe('localhost');
        });

        it('returns null by default when @path resolves to null and no default given', function (): void {
            $accessor = ObjectAccessor::from((object) []);
            expect($accessor->getTemplate('a.{k}', ['k' => '@missing']))->toBeNull();
        });

    });
});
