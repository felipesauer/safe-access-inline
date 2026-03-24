<?php

declare(strict_types=1);

use SafeAccessInline\Accessors\ArrayAccessor;
use SafeAccessInline\Accessors\EnvAccessor;
use SafeAccessInline\Accessors\IniAccessor;
use SafeAccessInline\Accessors\JsonAccessor;
use SafeAccessInline\Accessors\ObjectAccessor;
use SafeAccessInline\Accessors\XmlAccessor;
use SafeAccessInline\Enums\Format;
use SafeAccessInline\Exceptions\InvalidFormatException;
use SafeAccessInline\Exceptions\SecurityException;
use SafeAccessInline\SafeAccess;
use SafeAccessInline\Security\Guards\SecurityPolicy;

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

    it('from() with format "env"', function () {
        $accessor = SafeAccess::from("KEY=value", 'env');
        expect($accessor)->toBeInstanceOf(EnvAccessor::class);
        expect($accessor->get('KEY'))->toBe('value');
    });

    it('from() throws InvalidFormatException for unknown format', function () {
        SafeAccess::from('data', 'unknown_xyz');
    })->throws(InvalidFormatException::class, "Unknown format 'unknown_xyz'");

    // ── from() with Format enum ─────────────

    it('from() with Format enum', function () {
        $accessor = SafeAccess::from(['name' => 'Ana'], Format::Array);
        expect($accessor)->toBeInstanceOf(ArrayAccessor::class);
        expect($accessor->get('name'))->toBe('Ana');
    });

    // ── setGlobalPolicy / clearGlobalPolicy ─────────

    it('setGlobalPolicy and clearGlobalPolicy delegate to SecurityPolicy', function () {
        $policy = new SecurityPolicy(maxDepth: 99);
        SafeAccess::setGlobalPolicy($policy);
        expect(SecurityPolicy::getGlobal())->toBe($policy);
        SafeAccess::clearGlobalPolicy();
        expect(SecurityPolicy::getGlobal())->toBeNull();
    });

    // ── withPolicy enforcement ──────────────────────

    it('withPolicy enforces maxPayloadBytes', function () {
        $bigString = str_repeat('x', 2000);
        $policy = new SecurityPolicy(maxPayloadBytes: 100);
        SafeAccess::withPolicy($bigString, $policy);
    })->throws(SecurityException::class, 'Payload size');

    it('withPolicy enforces maxKeys', function () {
        $data = [];
        for ($i = 0; $i < 50; $i++) {
            $data["key{$i}"] = $i;
        }
        $policy = new SecurityPolicy(maxKeys: 10);
        SafeAccess::withPolicy($data, $policy);
    })->throws(SecurityException::class, 'exceeding maximum');

    it('withPolicy enforces maxDepth', function () {
        $data = ['a' => ['b' => ['c' => ['d' => ['e' => 'deep']]]]];
        $policy = new SecurityPolicy(maxDepth: 2);
        SafeAccess::withPolicy($data, $policy);
    })->throws(SecurityException::class, 'structural depth');

    it('withPolicy passes through when all limits are satisfied', function () {
        $data = ['key' => 'value'];
        $policy = new SecurityPolicy(maxDepth: 1_024, maxPayloadBytes: 104_857_600, maxKeys: 100_000);
        $accessor = SafeAccess::withPolicy($data, $policy);
        expect($accessor->get('key'))->toBe('value');
    });

    // ── resetAll ────────────────────────────────────

    it('resetAll clears all global state', function () {
        $policy = new SecurityPolicy(maxDepth: 99);
        SafeAccess::setGlobalPolicy($policy);
        SafeAccess::resetAll();
        expect(SecurityPolicy::getGlobal())->toBeNull();
    });

    // ── clearGlobalPolicy ──────────────────────────

    it('clearGlobalPolicy removes global policy', function () {
        $policy = new SecurityPolicy(maxDepth: 50);
        SafeAccess::setGlobalPolicy($policy);
        expect(SecurityPolicy::getGlobal())->not->toBeNull();
        SafeAccess::clearGlobalPolicy();
        expect(SecurityPolicy::getGlobal())->toBeNull();
    });

    // ── from() with unknown format ──────────────────

    it('from() throws for unknown unregistered format', function () {
        expect(fn () => SafeAccess::from('data', 'protobuf'))
            ->toThrow(\SafeAccessInline\Exceptions\InvalidFormatException::class, "Unknown format 'protobuf'");
    });

});
