<?php

use SafeAccessInline\Accessors\NdjsonAccessor;
use SafeAccessInline\Exceptions\InvalidFormatException;
use SafeAccessInline\SafeAccess;

describe(NdjsonAccessor::class, function () {

    $ndjson = '{"name":"Ana","age":30}' . "\n" . '{"name":"Bob","age":25}' . "\n" . '{"name":"Carlos","age":35}';

    it('parses NDJSON string into indexed records', function () use ($ndjson) {
        $acc = NdjsonAccessor::from($ndjson);
        expect($acc->get('0.name'))->toBe('Ana');
        expect($acc->get('1.name'))->toBe('Bob');
        expect($acc->get('2.age'))->toBe(35);
    });

    it('handles empty NDJSON string', function () {
        $acc = NdjsonAccessor::from('');
        expect($acc->all())->toBe([]);
    });

    it('handles single-line NDJSON', function () {
        $acc = NdjsonAccessor::from('{"key":"value"}');
        expect($acc->get('0.key'))->toBe('value');
    });

    it('ignores blank lines', function () {
        $acc = NdjsonAccessor::from('{"a":1}' . "\n\n" . '{"b":2}' . "\n");
        expect($acc->get('0.a'))->toBe(1);
        expect($acc->get('1.b'))->toBe(2);
    });

    it('throws on non-string input', function () {
        NdjsonAccessor::from(123);
    })->throws(InvalidFormatException::class);

    it('throws on invalid JSON line', function () {
        NdjsonAccessor::from('{"valid":true}' . "\n" . 'not-json');
    })->throws(InvalidFormatException::class);

    it('supports set (immutable)', function () use ($ndjson) {
        $acc = NdjsonAccessor::from($ndjson);
        $updated = $acc->set('0.name', 'Ana Maria');
        expect($updated->get('0.name'))->toBe('Ana Maria');
        expect($acc->get('0.name'))->toBe('Ana');
    });

    it('supports wildcard paths', function () use ($ndjson) {
        $acc = NdjsonAccessor::from($ndjson);
        expect($acc->get('*.name'))->toBe(['Ana', 'Bob', 'Carlos']);
    });

    it('toNdjson serializes back', function () use ($ndjson) {
        $acc = NdjsonAccessor::from($ndjson);
        $output = $acc->toNdjson();
        $lines = explode("\n", $output);
        expect(count($lines))->toBe(3);
        expect(json_decode($lines[0], true))->toBe(['name' => 'Ana', 'age' => 30]);
    });
});

describe('SafeAccess::fromNdjson()', function () {

    it('creates NdjsonAccessor via facade', function () {
        $acc = SafeAccess::fromNdjson('{"x":1}' . "\n" . '{"y":2}');
        expect($acc)->toBeInstanceOf(NdjsonAccessor::class);
        expect($acc->get('0.x'))->toBe(1);
    });

    it('from() with format ndjson', function () {
        $acc = SafeAccess::from('{"x":1}' . "\n" . '{"y":2}', 'ndjson');
        expect($acc)->toBeInstanceOf(NdjsonAccessor::class);
    });
});
