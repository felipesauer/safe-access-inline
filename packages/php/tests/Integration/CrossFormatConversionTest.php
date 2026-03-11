<?php

use SafeAccessInline\SafeAccess;

describe('Cross-format conversion', function () {

    it('JSON → Array → JSON roundtrip preserves data', function () {
        $json = '{"user": {"name": "Ana", "age": 30}}';
        $accessor = SafeAccess::fromJson($json);
        $array = $accessor->toArray();

        $accessor2 = SafeAccess::fromArray($array);
        $json2 = $accessor2->toJson();

        expect(json_decode($json2, true))->toBe(json_decode($json, true));
    });

    it('Array → JSON → Array roundtrip', function () {
        $data = ['items' => [['name' => 'A'], ['name' => 'B']]];
        $accessor = SafeAccess::fromArray($data);
        $json = $accessor->toJson();

        $accessor2 = SafeAccess::fromJson($json);
        expect($accessor2->toArray())->toBe($data);
    });

    it('JSON → Object → JSON roundtrip', function () {
        $json = '{"name": "Ana", "active": true}';
        $accessor = SafeAccess::fromJson($json);
        $obj = $accessor->toObject();

        $accessor2 = SafeAccess::fromObject($obj);
        expect(json_decode($accessor2->toJson(), true))->toBe(json_decode($json, true));
    });

    it('XML → Array → XML roundtrip preserves values', function () {
        $xml = '<root><name>Ana</name><age>30</age></root>';
        $accessor = SafeAccess::fromXml($xml);
        $array = $accessor->toArray();

        expect($array['name'])->toBe('Ana');
        expect($array['age'])->toBe('30');

        $accessor2 = SafeAccess::fromArray($array);
        expect($accessor2->get('name'))->toBe('Ana');
        expect($accessor2->get('age'))->toBe('30');
    });

    it('CSV → Array → JSON pipeline', function () {
        $csv = "name,age\nAna,30\nBob,25";
        $accessor = SafeAccess::fromCsv($csv);
        $array = $accessor->toArray();

        $accessor2 = SafeAccess::fromArray($array);
        $json = $accessor2->toJson();
        $decoded = json_decode($json, true);

        expect($decoded[0]['name'])->toBe('Ana');
        expect($decoded[1]['name'])->toBe('Bob');
    });

    it('INI → Array → JSON pipeline', function () {
        $ini = "[database]\nhost=localhost\nport=3306";
        $accessor = SafeAccess::fromIni($ini);

        $json = $accessor->toJson();
        $decoded = json_decode($json, true);

        expect($decoded['database']['host'])->toBe('localhost');
        expect($decoded['database']['port'])->toBe(3306);
    });

    it('ENV → Array → JSON pipeline', function () {
        $env = "APP_KEY=secret\nDEBUG=true";
        $accessor = SafeAccess::fromEnv($env);

        $json = $accessor->toJson();
        $decoded = json_decode($json, true);

        expect($decoded['APP_KEY'])->toBe('secret');
        expect($decoded['DEBUG'])->toBe('true');
    });

    it('detect() returns correct accessor for each format', function () {
        expect(SafeAccess::detect(['a' => 1]))->toBeInstanceOf(\SafeAccessInline\Accessors\ArrayAccessor::class);
        expect(SafeAccess::detect((object) ['a' => 1]))->toBeInstanceOf(\SafeAccessInline\Accessors\ObjectAccessor::class);
        expect(SafeAccess::detect('{"a": 1}'))->toBeInstanceOf(\SafeAccessInline\Accessors\JsonAccessor::class);
        expect(SafeAccess::detect('<root><a>1</a></root>'))->toBeInstanceOf(\SafeAccessInline\Accessors\XmlAccessor::class);
    });

});
