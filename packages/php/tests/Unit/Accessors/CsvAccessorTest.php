<?php

use SafeAccessInline\Accessors\CsvAccessor;
use SafeAccessInline\Exceptions\InvalidFormatException;

describe(CsvAccessor::class, function () {

    it('from — valid CSV', function () {
        $accessor = CsvAccessor::from("name,age\nAna,30\nBob,25");
        expect($accessor)->toBeInstanceOf(CsvAccessor::class);
    });

    it('from — invalid type throws', function () {
        CsvAccessor::from(123);
    })->throws(InvalidFormatException::class);

    it('get — row by index', function () {
        $accessor = CsvAccessor::from("name,age\nAna,30\nBob,25");
        expect($accessor->get('0.name'))->toBe('Ana');
        expect($accessor->get('0.age'))->toBe('30');
        expect($accessor->get('1.name'))->toBe('Bob');
    });

    it('get — wildcard', function () {
        $accessor = CsvAccessor::from("name,age\nAna,30\nBob,25");
        expect($accessor->get('*.name'))->toBe(['Ana', 'Bob']);
    });

    it('get — nonexistent returns default', function () {
        $accessor = CsvAccessor::from("name,age\nAna,30");
        expect($accessor->get('5.name', 'default'))->toBe('default');
    });

    it('has — existing', function () {
        $accessor = CsvAccessor::from("name,age\nAna,30");
        expect($accessor->has('0.name'))->toBeTrue();
    });

    it('has — nonexistent', function () {
        $accessor = CsvAccessor::from("name,age\nAna,30");
        expect($accessor->has('5.name'))->toBeFalse();
    });

    it('count — rows', function () {
        $accessor = CsvAccessor::from("name,age\nAna,30\nBob,25\nCarlos,35");
        expect($accessor->count())->toBe(3);
    });

    it('toArray', function () {
        $accessor = CsvAccessor::from("name,age\nAna,30");
        expect($accessor->toArray())->toBe([['name' => 'Ana', 'age' => '30']]);
    });

    it('toJson', function () {
        $accessor = CsvAccessor::from("name,age\nAna,30");
        $decoded = json_decode($accessor->toJson(), true);
        expect($decoded[0]['name'])->toBe('Ana');
    });

    it('empty CSV', function () {
        $accessor = CsvAccessor::from("");
        expect($accessor->all())->toBe([]);
    });

});
