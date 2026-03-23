<?php

declare(strict_types=1);

use SafeAccessInline\Core\Config\ParserConfig;
use SafeAccessInline\Core\Parsers\DotNotationParser;
use SafeAccessInline\Exceptions\SecurityException;

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

    it('set — does not mutate intermediate nodes shared with original (I2)', function () {
        // Deep nested set must not bleed into the caller's existing nested array.
        $data = ['user' => ['name' => 'Alice', 'age' => 30]];
        DotNotationParser::set($data, 'user.email', 'alice@example.com');
        // The original $data['user'] must remain untouched.
        expect($data['user'])->toBe(['name' => 'Alice', 'age' => 30]);
    });

    it('remove — does not mutate intermediate nodes shared with original (I2)', function () {
        $data = ['user' => ['name' => 'Alice', 'role' => 'admin']];
        DotNotationParser::remove($data, 'user.role');
        // The original $data['user'] must remain untouched.
        expect($data['user'])->toBe(['name' => 'Alice', 'role' => 'admin']);
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

    it('merge — root merge result does not share PHP references with original (I4)', function () {
        // PHP &references inside the source data must NOT leak into the merge result.
        // deepMerge uses an explicit foreach copy (not $result = $target) to break
        // references at each level — mirroring JS's `{ ...target }` spread semantics.
        $inner = ['b' => 1, 'c' => 2];
        $data = [];
        $data['a'] = &$inner; // introduce a PHP reference
        $data['z'] = 99;

        $result = DotNotationParser::merge($data, '', ['extra' => true]);

        // Mutate the original referenced variable AFTER the merge
        $inner['HACKED'] = 'injected';

        // The result must be independent — $inner mutation must not affect it
        expect($result)->not->toHaveKey('HACKED');
        expect($result['a'])->not->toHaveKey('HACKED');
        expect($result['extra'])->toBeTrue();
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

    // ── Recursive descent multi-key ─────────────────────

    it("get — descent multi-key ..['name','age'] collects from nested", function () {
        $data = [
            'users' => [
                ['name' => 'Alice', 'age' => 25],
                ['name' => 'Bob', 'age' => 17],
            ],
        ];
        $result = DotNotationParser::get($data, "..['name','age']");
        expect($result)->toContain('Alice');
        expect($result)->toContain('Bob');
        expect($result)->toContain(25);
        expect($result)->toContain(17);
    });

    it("get — descent multi-key ..['title','price'] from array of objects", function () {
        $data = [
            'store' => [
                'books' => [
                    ['title' => 'A', 'price' => 10],
                    ['title' => 'B', 'price' => 20],
                ],
            ],
        ];
        $result = DotNotationParser::get($data, "..['title','price']");
        expect($result)->toContain('A');
        expect($result)->toContain('B');
        expect($result)->toContain(10);
        expect($result)->toContain(20);
        expect($result)->toHaveCount(4);
    });

    it("get — descent single-key in brackets ..['name'] acts as descent", function () {
        $data = ['name' => 'Root', 'child' => ['name' => 'Child']];
        $result = DotNotationParser::get($data, "..['name']");
        expect($result)->toContain('Root');
        expect($result)->toContain('Child');
    });

    it("get — descent multi-key returns default when no keys found", function () {
        $data = ['a' => 1];
        $result = DotNotationParser::get($data, "..['x','y']", 'fallback');
        expect($result)->toBe('fallback');
    });

    // ── Edge cases: Unicode NFC/NFD ─────────────────

    it('get — reads Unicode key in NFC form', function () {
        $nfc = "caf\u{00E9}"; // é in NFC
        $data = [$nfc => 42];
        expect(DotNotationParser::get($data, $nfc))->toBe(42);
    });

    it('get — does not confuse NFC and NFD Unicode keys', function () {
        $nfc = "caf\u{00E9}";
        $nfd = "cafe\u{0301}";
        $data = [$nfc => 'nfc-value', $nfd => 'nfd-value'];
        expect(DotNotationParser::get($data, $nfc))->toBe('nfc-value');
        expect(DotNotationParser::get($data, $nfd))->toBe('nfd-value');
    });

    it('get — handles emoji keys', function () {
        $data = ['\u{1F680}' => ['\u{2B50}' => 'star']];
        expect(DotNotationParser::get($data, '\u{1F680}.\u{2B50}'))->toBe('star');
    });

    it('set — creates value under Unicode key', function () {
        $result = DotNotationParser::set([], "\u{00FC}.nested", 'value');
        expect(DotNotationParser::get($result, "\u{00FC}.nested"))->toBe('value');
    });

    it('has — detects Unicode key', function () {
        $data = ['über' => ['straße' => true]];
        expect(DotNotationParser::has($data, 'über.straße'))->toBeTrue();
    });

    // ── Edge cases: circular-like deep traversal ─────

    it('get — returns default for very deep non-existent path', function () {
        $data = ['a' => ['b' => ['c' => 1]]];
        expect(DotNotationParser::get($data, 'a.b.c.d.e.f.g', 'fallback'))->toBe('fallback');
    });

    it('configure — sets custom ParserConfig', function () {
        DotNotationParser::configure(new ParserConfig(maxResolveDepth: 256));
        $data = ['a' => ['b' => 1]];
        expect(DotNotationParser::get($data, 'a.b'))->toBe(1);
        DotNotationParser::configure(new ParserConfig());
    });

    it('merge — throws SecurityException when depth exceeds maxResolveDepth', function () {
        DotNotationParser::configure(new ParserConfig(maxResolveDepth: 1));
        try {
            DotNotationParser::merge(
                ['a' => ['b' => ['c' => 1]]],
                '',
                ['a' => ['b' => ['c' => 2]]],
            );
        } finally {
            DotNotationParser::configure(new ParserConfig());
        }
    })->throws(SecurityException::class, 'Deep merge exceeded maximum depth');

});
