<?php

use SafeAccessInline\Core\DotNotationParser;

describe(DotNotationParser::class, function () {

    // ── get() ─────────────────────────────────────────────

    it('get — empty path returns default', function () {
        expect(DotNotationParser::get(['a' => 1], '', 'default'))->toBe('default');
    });

    it('get — simple key', function () {
        $data = ['name' => 'Ana', 'age' => 30];
        expect(DotNotationParser::get($data, 'name'))->toBe('Ana');
        expect(DotNotationParser::get($data, 'age'))->toBe(30);
    });

    it('get — nested key', function () {
        $data = ['user' => ['profile' => ['name' => 'Ana']]];
        expect(DotNotationParser::get($data, 'user.profile.name'))->toBe('Ana');
    });

    it('get — nonexistent key returns default', function () {
        expect(DotNotationParser::get(['a' => 1], 'x.y.z', 'fallback'))->toBe('fallback');
    });

    it('get — numeric index', function () {
        $data = ['items' => [['title' => 'First'], ['title' => 'Second']]];
        expect(DotNotationParser::get($data, 'items.0.title'))->toBe('First');
        expect(DotNotationParser::get($data, 'items.1.title'))->toBe('Second');
    });

    it('get — bracket notation', function () {
        $data = ['matrix' => [[1, 2], [3, 4]]];
        expect(DotNotationParser::get($data, 'matrix[0][1]'))->toBe(2);
        expect(DotNotationParser::get($data, 'matrix[1][0]'))->toBe(3);
    });

    it('get — wildcard returns array of values', function () {
        $data = ['users' => [['name' => 'Ana'], ['name' => 'Bob'], ['name' => 'Carlos']]];
        expect(DotNotationParser::get($data, 'users.*.name'))->toBe(['Ana', 'Bob', 'Carlos']);
    });

    it('get — wildcard at end returns all items', function () {
        $data = ['items' => ['a', 'b', 'c']];
        expect(DotNotationParser::get($data, 'items.*'))->toBe(['a', 'b', 'c']);
    });

    it('get — wildcard on non-array returns default', function () {
        $data = ['name' => 'Ana'];
        expect(DotNotationParser::get($data, 'name.*.x', 'default'))->toBe('default');
    });

    it('get — escaped dot treats as literal key', function () {
        $data = ['config.db' => ['host' => 'localhost']];
        expect(DotNotationParser::get($data, 'config\.db.host'))->toBe('localhost');
    });

    it('get — null value is returned (not default)', function () {
        $data = ['key' => null];
        expect(DotNotationParser::get($data, 'key', 'default'))->toBeNull();
    });

    it('get — false value is returned (not default)', function () {
        $data = ['active' => false];
        expect(DotNotationParser::get($data, 'active', true))->toBeFalse();
    });

    // ── has() ─────────────────────────────────────────────

    it('has — existing key', function () {
        expect(DotNotationParser::has(['a' => ['b' => 1]], 'a.b'))->toBeTrue();
    });

    it('has — nonexistent key', function () {
        expect(DotNotationParser::has(['a' => 1], 'x.y'))->toBeFalse();
    });

    it('has — existing null value', function () {
        expect(DotNotationParser::has(['key' => null], 'key'))->toBeTrue();
    });

    // ── set() ─────────────────────────────────────────────

    it('set — creates new nested path', function () {
        $result = DotNotationParser::set([], 'a.b.c', 'value');
        expect($result)->toBe(['a' => ['b' => ['c' => 'value']]]);
    });

    it('set — overwrites existing value', function () {
        $data = ['name' => 'old'];
        $result = DotNotationParser::set($data, 'name', 'new');
        expect($result['name'])->toBe('new');
    });

    it('set — does not mutate original', function () {
        $data = ['a' => 1];
        $result = DotNotationParser::set($data, 'b', 2);
        expect($data)->toBe(['a' => 1]);
        expect($result)->toBe(['a' => 1, 'b' => 2]);
    });

    // ── remove() ──────────────────────────────────────────

    it('remove — existing key', function () {
        $data = ['a' => ['b' => 1, 'c' => 2]];
        $result = DotNotationParser::remove($data, 'a.b');
        expect($result)->toBe(['a' => ['c' => 2]]);
    });

    it('remove — nonexistent key returns unchanged', function () {
        $data = ['a' => 1];
        $result = DotNotationParser::remove($data, 'x.y.z');
        expect($result)->toBe(['a' => 1]);
    });

    it('remove — does not mutate original', function () {
        $data = ['a' => 1, 'b' => 2];
        $result = DotNotationParser::remove($data, 'b');
        expect($data)->toBe(['a' => 1, 'b' => 2]);
        expect($result)->toBe(['a' => 1]);
    });

    it('remove — empty path returns unchanged', function () {
        $data = ['a' => 1];
        $result = DotNotationParser::remove($data, '');
        expect($result)->toBe(['a' => 1]);
    });

});
