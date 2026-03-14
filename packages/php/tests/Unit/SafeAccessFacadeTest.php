<?php

use SafeAccessInline\Accessors\ArrayAccessor;
use SafeAccessInline\Accessors\CsvAccessor;
use SafeAccessInline\Accessors\EnvAccessor;
use SafeAccessInline\Accessors\IniAccessor;
use SafeAccessInline\Accessors\JsonAccessor;
use SafeAccessInline\Accessors\ObjectAccessor;
use SafeAccessInline\Accessors\XmlAccessor;
use SafeAccessInline\Enums\AccessorFormat;
use SafeAccessInline\Exceptions\InvalidFormatException;
use SafeAccessInline\SafeAccess;
use SafeAccessInline\Security\SecurityPolicy;

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

    // ── from() ──────────────────────────────────────────

    it('from() auto-detects array', function () {
        $accessor = SafeAccess::from(['name' => 'Ana']);
        expect($accessor)->toBeInstanceOf(ArrayAccessor::class);
        expect($accessor->get('name'))->toBe('Ana');
    });

    it('from() auto-detects object', function () {
        $accessor = SafeAccess::from((object) ['name' => 'Ana']);
        expect($accessor)->toBeInstanceOf(ObjectAccessor::class);
        expect($accessor->get('name'))->toBe('Ana');
    });

    it('from() auto-detects JSON string', function () {
        $accessor = SafeAccess::from('{"name": "Ana"}');
        expect($accessor)->toBeInstanceOf(JsonAccessor::class);
        expect($accessor->get('name'))->toBe('Ana');
    });

    it('from() with format "array"', function () {
        $accessor = SafeAccess::from(['name' => 'Ana'], 'array');
        expect($accessor)->toBeInstanceOf(ArrayAccessor::class);
        expect($accessor->get('name'))->toBe('Ana');
    });

    it('from() with format "object"', function () {
        $accessor = SafeAccess::from((object) ['name' => 'Ana'], 'object');
        expect($accessor)->toBeInstanceOf(ObjectAccessor::class);
        expect($accessor->get('name'))->toBe('Ana');
    });

    it('from() with format "json"', function () {
        $accessor = SafeAccess::from('{"name": "Ana"}', 'json');
        expect($accessor)->toBeInstanceOf(JsonAccessor::class);
        expect($accessor->get('name'))->toBe('Ana');
    });

    it('from() with format "xml"', function () {
        $accessor = SafeAccess::from('<root><name>Ana</name></root>', 'xml');
        expect($accessor)->toBeInstanceOf(XmlAccessor::class);
        expect($accessor->get('name'))->toBe('Ana');
    });

    it('from() with format "ini"', function () {
        $accessor = SafeAccess::from("[section]\nkey=value", 'ini');
        expect($accessor)->toBeInstanceOf(IniAccessor::class);
        expect($accessor->get('section.key'))->toBe('value');
    });

    it('from() with format "csv"', function () {
        $accessor = SafeAccess::from("name,age\nAna,30", 'csv');
        expect($accessor)->toBeInstanceOf(CsvAccessor::class);
        expect($accessor->get('0.name'))->toBe('Ana');
    });

    it('from() with format "env"', function () {
        $accessor = SafeAccess::from("KEY=value", 'env');
        expect($accessor)->toBeInstanceOf(EnvAccessor::class);
        expect($accessor->get('KEY'))->toBe('value');
    });

    it('from() with custom format registered via extend()', function () {
        SafeAccess::extend('from_test_format', ArrayAccessor::class);
        $accessor = SafeAccess::from(['a' => 1], 'from_test_format');
        expect($accessor)->toBeInstanceOf(ArrayAccessor::class);
        expect($accessor->get('a'))->toBe(1);
    });

    it('from() throws InvalidFormatException for unknown format', function () {
        SafeAccess::from('data', 'unknown_xyz');
    })->throws(InvalidFormatException::class, "Unknown format 'unknown_xyz'");

    // ── from() with AccessorFormat enum ─────────────

    it('from() with AccessorFormat enum', function () {
        $accessor = SafeAccess::from(['name' => 'Ana'], AccessorFormat::Array);
        expect($accessor)->toBeInstanceOf(ArrayAccessor::class);
        expect($accessor->get('name'))->toBe('Ana');
    });

    // ── fromFile with extensionless path ────────────

    it('fromFile auto-detects format for extensionless file', function () {
        $tmp = tempnam(sys_get_temp_dir(), 'sa-ext-');
        file_put_contents($tmp, '{"key":"value"}');
        try {
            $accessor = SafeAccess::fromFile($tmp);
            expect($accessor)->toBeInstanceOf(JsonAccessor::class);
            expect($accessor->get('key'))->toBe('value');
        } finally {
            unlink($tmp);
        }
    });

    // ── setGlobalPolicy / clearGlobalPolicy ─────────

    it('setGlobalPolicy and clearGlobalPolicy delegate to SecurityPolicy', function () {
        $policy = new SecurityPolicy(maxDepth: 99);
        SafeAccess::setGlobalPolicy($policy);
        expect(SecurityPolicy::getGlobal())->toBe($policy);
        SafeAccess::clearGlobalPolicy();
        expect(SecurityPolicy::getGlobal())->toBeNull();
    });
});
