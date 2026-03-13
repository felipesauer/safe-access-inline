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

    it('get — wildcard with non-array child returns default per item', function () {
        $data = ['items' => ['not-array', 'also-not']];
        $result = DotNotationParser::get($data, 'items.*.name', 'fallback');
        expect($result)->toBe(['fallback', 'fallback']);
    });

    it('set — overwrites non-array intermediate value', function () {
        $data = ['a' => 'string-value'];
        $result = DotNotationParser::set($data, 'a.b', 'deep');
        expect($result['a']['b'])->toBe('deep');
    });

    // ── merge() ───────────────────────────────────────────

    it('merge — deep merges at root', function () {
        $data = ['a' => 1, 'b' => ['x' => 10, 'y' => 20]];
        $result = DotNotationParser::merge($data, '', ['b' => ['y' => 99, 'z' => 30], 'c' => 3]);
        expect($result)->toBe(['a' => 1, 'b' => ['x' => 10, 'y' => 99, 'z' => 30], 'c' => 3]);
    });

    it('merge — deep merges at path', function () {
        $data = ['config' => ['db' => ['host' => 'localhost', 'port' => 3306]]];
        $result = DotNotationParser::merge($data, 'config.db', ['port' => 5432, 'name' => 'mydb']);
        expect($result)->toBe(['config' => ['db' => ['host' => 'localhost', 'port' => 5432, 'name' => 'mydb']]]);
    });

    it('merge — replaces list arrays (does not concat)', function () {
        $data = ['tags' => ['a', 'b']];
        $result = DotNotationParser::merge($data, '', ['tags' => ['c']]);
        expect($result)->toBe(['tags' => ['c']]);
    });

    it('merge — replaces scalar with array at path', function () {
        $data = ['a' => 'string'];
        $result = DotNotationParser::merge($data, 'a', ['b' => 1]);
        expect($result)->toBe(['a' => ['b' => 1]]);
    });

    it('merge — creates path if it does not exist', function () {
        $data = ['a' => 1];
        $result = DotNotationParser::merge($data, 'b.c', ['d' => 2]);
        expect($result)->toBe(['a' => 1, 'b' => ['c' => ['d' => 2]]]);
    });

    it('merge — does not mutate original', function () {
        $data = ['a' => ['b' => 1]];
        $result = DotNotationParser::merge($data, '', ['a' => ['c' => 2]]);
        expect($data)->toBe(['a' => ['b' => 1]]);
        expect($result)->toBe(['a' => ['b' => 1, 'c' => 2]]);
    });

    it('merge — deeply nested merge', function () {
        $data = ['a' => ['b' => ['c' => ['d' => 1, 'e' => 2]]]];
        $result = DotNotationParser::merge($data, 'a.b', ['c' => ['e' => 99, 'f' => 3]]);
        expect($result)->toBe(['a' => ['b' => ['c' => ['d' => 1, 'e' => 99, 'f' => 3]]]]);
    });

    // ── Filter expressions ────────────────────────────

    it('get — filter by equality', function () {
        $data = [
            'users' => [
                ['name' => 'Ana', 'role' => 'admin'],
                ['name' => 'Bob', 'role' => 'user'],
                ['name' => 'Carlos', 'role' => 'admin'],
            ],
        ];
        $result = DotNotationParser::get($data, "users[?role=='admin']");
        expect($result)->toBe([
            ['name' => 'Ana', 'role' => 'admin'],
            ['name' => 'Carlos', 'role' => 'admin'],
        ]);
    });

    it('get — filter with numeric comparison', function () {
        $data = [
            'products' => [
                ['name' => 'A', 'price' => 10],
                ['name' => 'B', 'price' => 50],
                ['name' => 'C', 'price' => 30],
            ],
        ];
        expect(DotNotationParser::get($data, 'products[?price>20].name'))->toBe(['B', 'C']);
    });

    it('get — filter with && (AND)', function () {
        $data = [
            'items' => [
                ['type' => 'fruit', 'color' => 'red', 'name' => 'apple'],
                ['type' => 'fruit', 'color' => 'yellow', 'name' => 'banana'],
                ['type' => 'vegetable', 'color' => 'red', 'name' => 'tomato'],
            ],
        ];
        $result = DotNotationParser::get($data, "items[?type=='fruit' && color=='red'].name");
        expect($result)->toBe(['apple']);
    });

    it('get — filter with || (OR)', function () {
        $data = [
            'scores' => [
                ['student' => 'Ana', 'grade' => 95],
                ['student' => 'Bob', 'grade' => 60],
                ['student' => 'Carlos', 'grade' => 40],
            ],
        ];
        $result = DotNotationParser::get($data, 'scores[?grade>=90 || grade<50].student');
        expect($result)->toBe(['Ana', 'Carlos']);
    });

    it('get — filter returns empty array when no match', function () {
        $data = ['items' => [['a' => 1], ['a' => 2]]];
        expect(DotNotationParser::get($data, 'items[?a>100]'))->toBe([]);
    });

    it('get — filter on non-array returns default', function () {
        $data = ['value' => 'string'];
        expect(DotNotationParser::get($data, "value[?x=='y']", 'nope'))->toBe('nope');
    });

    // ── Recursive descent ─────────────────────────────

    it('get — descent collects all matching keys', function () {
        $data = [
            'a' => ['name' => 'root-a', 'nested' => ['name' => 'deep-a']],
            'b' => ['name' => 'root-b'],
        ];
        expect(DotNotationParser::get($data, '..name'))->toBe(['root-a', 'deep-a', 'root-b']);
    });

    it('get — descent with further path', function () {
        $data = [
            'level1' => [
                'items' => [['id' => 1], ['id' => 2]],
                'nested' => [
                    'items' => [['id' => 3]],
                ],
            ],
        ];
        $result = DotNotationParser::get($data, '..items.*.id');
        expect($result)->toBe([1, 2, 3]);
    });

    it('get — descent on flat structure', function () {
        $data = ['x' => 1, 'y' => ['x' => 2]];
        expect(DotNotationParser::get($data, '..x'))->toBe([1, 2]);
    });

    it('get — descent returns empty array when key not found', function () {
        $data = ['a' => ['b' => 1]];
        expect(DotNotationParser::get($data, '..z'))->toBe([]);
    });

    // ── Combined filter + descent ─────────────────────

    it('get — descent with filter', function () {
        $data = [
            'dept1' => [
                'employees' => [
                    ['name' => 'Ana', 'active' => true],
                    ['name' => 'Bob', 'active' => false],
                ],
            ],
            'dept2' => [
                'employees' => [
                    ['name' => 'Carlos', 'active' => true],
                ],
            ],
        ];
        $result = DotNotationParser::get($data, "..employees[?active==true].name");
        expect($result)->toBe(['Ana', 'Carlos']);
    });

});
