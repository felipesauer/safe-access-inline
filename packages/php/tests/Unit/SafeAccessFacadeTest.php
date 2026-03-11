<?php

use SafeAccessInline\Accessors\ArrayAccessor;
use SafeAccessInline\Accessors\CsvAccessor;
use SafeAccessInline\Accessors\EnvAccessor;
use SafeAccessInline\Accessors\IniAccessor;
use SafeAccessInline\Accessors\JsonAccessor;
use SafeAccessInline\Accessors\ObjectAccessor;
use SafeAccessInline\Accessors\XmlAccessor;
use SafeAccessInline\SafeAccess;

describe(SafeAccess::class, function () {

    it('fromArray', function () {
        $accessor = SafeAccess::fromArray(['name' => 'Ana']);
        expect($accessor)->toBeInstanceOf(ArrayAccessor::class);
        expect($accessor->get('name'))->toBe('Ana');
    });

    it('fromObject', function () {
        $accessor = SafeAccess::fromObject((object) ['name' => 'Ana']);
        expect($accessor)->toBeInstanceOf(ObjectAccessor::class);
        expect($accessor->get('name'))->toBe('Ana');
    });

    it('fromJson', function () {
        $accessor = SafeAccess::fromJson('{"name": "Ana"}');
        expect($accessor)->toBeInstanceOf(JsonAccessor::class);
        expect($accessor->get('name'))->toBe('Ana');
    });

    it('fromXml', function () {
        $accessor = SafeAccess::fromXml('<root><name>Ana</name></root>');
        expect($accessor)->toBeInstanceOf(XmlAccessor::class);
        expect($accessor->get('name'))->toBe('Ana');
    });

    it('fromIni', function () {
        $accessor = SafeAccess::fromIni("[section]\nkey=value");
        expect($accessor)->toBeInstanceOf(IniAccessor::class);
        expect($accessor->get('section.key'))->toBe('value');
    });

    it('fromCsv', function () {
        $accessor = SafeAccess::fromCsv("name,age\nAna,30");
        expect($accessor)->toBeInstanceOf(CsvAccessor::class);
        expect($accessor->get('0.name'))->toBe('Ana');
    });

    it('fromEnv', function () {
        $accessor = SafeAccess::fromEnv("KEY=value");
        expect($accessor)->toBeInstanceOf(EnvAccessor::class);
        expect($accessor->get('KEY'))->toBe('value');
    });

    it('detect — array', function () {
        $accessor = SafeAccess::detect(['a' => 1]);
        expect($accessor)->toBeInstanceOf(ArrayAccessor::class);
    });

    it('detect — JSON string', function () {
        $accessor = SafeAccess::detect('{"key": "value"}');
        expect($accessor)->toBeInstanceOf(JsonAccessor::class);
    });

    it('detect — object', function () {
        $accessor = SafeAccess::detect((object) ['a' => 1]);
        expect($accessor)->toBeInstanceOf(ObjectAccessor::class);
    });

    it('extend and custom', function () {
        SafeAccess::extend('test_format', ArrayAccessor::class);
        $accessor = SafeAccess::custom('test_format', ['a' => 1]);
        expect($accessor)->toBeInstanceOf(ArrayAccessor::class);
        expect($accessor->get('a'))->toBe(1);
    });

    it('custom — unregistered throws', function () {
        SafeAccess::custom('nonexistent', []);
    })->throws(\RuntimeException::class);

});
