<?php

use SafeAccessInline\Core\JsonPatch;
use SafeAccessInline\Exceptions\ReadonlyViolationException;
use SafeAccessInline\SafeAccess;

describe(JsonPatch::class, function () {

    // ── diff() ────────────────────────────────

    it('detects added keys', function () {
        $ops = JsonPatch::diff(['a' => 1], ['a' => 1, 'b' => 2]);
        expect($ops)->toBe([['op' => 'add', 'path' => '/b', 'value' => 2]]);
    });

    it('detects removed keys', function () {
        $ops = JsonPatch::diff(['a' => 1, 'b' => 2], ['a' => 1]);
        expect($ops)->toBe([['op' => 'remove', 'path' => '/b']]);
    });

    it('detects replaced values', function () {
        $ops = JsonPatch::diff(['a' => 1], ['a' => 2]);
        expect($ops)->toBe([['op' => 'replace', 'path' => '/a', 'value' => 2]]);
    });

    it('diffs nested objects recursively', function () {
        $a = ['user' => ['name' => 'Ana', 'age' => 30]];
        $b = ['user' => ['name' => 'Ana', 'age' => 31]];
        $ops = JsonPatch::diff($a, $b);
        expect($ops)->toBe([['op' => 'replace', 'path' => '/user/age', 'value' => 31]]);
    });

    it('returns empty for identical objects', function () {
        $ops = JsonPatch::diff(['a' => 1, 'b' => ['c' => 2]], ['a' => 1, 'b' => ['c' => 2]]);
        expect($ops)->toBe([]);
    });

    // ── list-array diffs (diffArrays) ───────────

    it('diffs list arrays - added elements', function () {
        $a = ['items' => [1, 2]];
        $b = ['items' => [1, 2, 3]];
        $ops = JsonPatch::diff($a, $b);
        expect($ops)->toBe([['op' => 'add', 'path' => '/items/2', 'value' => 3]]);
    });

    it('diffs list arrays - removed elements', function () {
        $a = ['items' => [1, 2, 3]];
        $b = ['items' => [1, 2]];
        $ops = JsonPatch::diff($a, $b);
        expect($ops)->toHaveCount(1);
        expect($ops[0]['op'])->toBe('remove');
    });

    it('diffs list arrays - replaced elements', function () {
        $a = ['items' => ['a', 'b']];
        $b = ['items' => ['a', 'c']];
        $ops = JsonPatch::diff($a, $b);
        expect($ops)->toBe([['op' => 'replace', 'path' => '/items/1', 'value' => 'c']]);
    });

    it('diffs nested objects inside list arrays', function () {
        $a = ['users' => [['name' => 'Ana'], ['name' => 'Bob']]];
        $b = ['users' => [['name' => 'Ana'], ['name' => 'Carlos']]];
        $ops = JsonPatch::diff($a, $b);
        expect($ops)->toBe([['op' => 'replace', 'path' => '/users/1/name', 'value' => 'Carlos']]);
    });

    // ── pointer escaping ────────────────────────

    it('escapes tilde in key names', function () {
        $a = ['a~b' => 1];
        $b = ['a~b' => 2];
        $ops = JsonPatch::diff($a, $b);
        expect($ops)->toBe([['op' => 'replace', 'path' => '/a~0b', 'value' => 2]]);
    });

    it('escapes slash in key names', function () {
        $a = ['a/b' => 1];
        $b = ['a/b' => 2];
        $ops = JsonPatch::diff($a, $b);
        expect($ops)->toBe([['op' => 'replace', 'path' => '/a~1b', 'value' => 2]]);
    });

    it('apply patch with pointer-escaped keys', function () {
        $result = JsonPatch::applyPatch(
            ['a/b' => 1],
            [['op' => 'replace', 'path' => '/a~1b', 'value' => 99]]
        );
        expect($result)->toBe(['a/b' => 99]);
    });

    // ── applyPatch() ─────────────────────────────

    it('applies add operation', function () {
        $result = JsonPatch::applyPatch(['a' => 1], [['op' => 'add', 'path' => '/b', 'value' => 2]]);
        expect($result)->toBe(['a' => 1, 'b' => 2]);
    });

    it('applies remove operation', function () {
        $result = JsonPatch::applyPatch(['a' => 1, 'b' => 2], [['op' => 'remove', 'path' => '/b']]);
        expect($result)->toBe(['a' => 1]);
    });

    it('applies replace operation', function () {
        $result = JsonPatch::applyPatch(['a' => 1], [['op' => 'replace', 'path' => '/a', 'value' => 99]]);
        expect($result)->toBe(['a' => 99]);
    });

    it('applies move operation', function () {
        $result = JsonPatch::applyPatch(['a' => 1, 'b' => 2], [['op' => 'move', 'from' => '/a', 'path' => '/c']]);
        expect($result)->toHaveKey('b', 2);
        expect($result)->toHaveKey('c', 1);
        expect($result)->not->toHaveKey('a');
    });

    it('applies copy operation', function () {
        $result = JsonPatch::applyPatch(['a' => 1], [['op' => 'copy', 'from' => '/a', 'path' => '/b']]);
        expect($result)->toBe(['a' => 1, 'b' => 1]);
    });

    it('test operation succeeds for matching value', function () {
        $result = JsonPatch::applyPatch(['a' => 1], [['op' => 'test', 'path' => '/a', 'value' => 1]]);
        expect($result)->toBe(['a' => 1]);
    });

    it('test operation fails for non-matching value', function () {
        JsonPatch::applyPatch(['a' => 1], [['op' => 'test', 'path' => '/a', 'value' => 999]]);
    })->throws(\RuntimeException::class);

    it('applies multiple operations', function () {
        $ops = [
            ['op' => 'add', 'path' => '/b', 'value' => 2],
            ['op' => 'replace', 'path' => '/a', 'value' => 10],
            ['op' => 'remove', 'path' => '/b'],
        ];
        $result = JsonPatch::applyPatch(['a' => 1], $ops);
        expect($result)->toBe(['a' => 10]);
    });
});

describe('AbstractAccessor readonly mode', function () {

    it('allows read operations on readonly accessor', function () {
        $acc = new class ('{"db":{"host":"localhost"}}', true) extends \SafeAccessInline\Accessors\JsonAccessor {
            public function __construct(string $raw, bool $readonly)
            {
                parent::__construct($raw, $readonly);
            }
        };
        expect($acc->get('db.host'))->toBe('localhost');
        expect($acc->has('db.host'))->toBeTrue();
    });

    it('throws ReadonlyViolationException on set()', function () {
        $acc = new class ('{"a":1}', true) extends \SafeAccessInline\Accessors\JsonAccessor {
            public function __construct(string $raw, bool $readonly)
            {
                parent::__construct($raw, $readonly);
            }
        };
        $acc->set('a', 2);
    })->throws(ReadonlyViolationException::class);

    it('throws ReadonlyViolationException on remove()', function () {
        $acc = new class ('{"a":1}', true) extends \SafeAccessInline\Accessors\JsonAccessor {
            public function __construct(string $raw, bool $readonly)
            {
                parent::__construct($raw, $readonly);
            }
        };
        $acc->remove('a');
    })->throws(ReadonlyViolationException::class);

    it('throws ReadonlyViolationException on merge()', function () {
        $acc = new class ('{"a":1}', true) extends \SafeAccessInline\Accessors\JsonAccessor {
            public function __construct(string $raw, bool $readonly)
            {
                parent::__construct($raw, $readonly);
            }
        };
        $acc->merge(['b' => 2]);
    })->throws(ReadonlyViolationException::class);
});

describe('AbstractAccessor diff/applyPatch', function () {

    it('diff returns patch between two accessors', function () {
        $a = SafeAccess::fromJson('{"name":"Ana","age":30}');
        $b = SafeAccess::fromJson('{"name":"Ana","age":31}');
        $ops = $a->diff($b);
        expect($ops)->toBe([['op' => 'replace', 'path' => '/age', 'value' => 31]]);
    });

    it('applyPatch applies patch to accessor', function () {
        $acc = SafeAccess::fromJson('{"name":"Ana","age":30}');
        $patched = $acc->applyPatch([['op' => 'replace', 'path' => '/age', 'value' => 31]]);
        expect($patched->get('age'))->toBe(31);
        expect($acc->get('age'))->toBe(30);
    });

    it('roundtrip: diff then applyPatch', function () {
        $a = SafeAccess::fromJson('{"a":1,"b":{"c":2}}');
        $b = SafeAccess::fromJson('{"a":1,"b":{"c":3},"d":4}');
        $ops = $a->diff($b);
        $result = $a->applyPatch($ops);
        expect($result->all())->toBe($b->all());
    });
});

// ── AbstractAccessor extra methods ──────────────────

describe('AbstractAccessor getTemplate and merge(array)', function () {

    it('getTemplate resolves template path with bindings', function () {
        $acc = SafeAccess::fromArray([
            'users' => [
                ['name' => 'Ana'],
                ['name' => 'Bob'],
            ],
        ]);
        $result = $acc->getTemplate('users.{idx}.name', ['idx' => '1']);
        expect($result)->toBe('Bob');
    });

    it('getTemplate returns default when path not found', function () {
        $acc = SafeAccess::fromArray(['users' => []]);
        $result = $acc->getTemplate('users.{idx}.name', ['idx' => '99'], 'unknown');
        expect($result)->toBe('unknown');
    });

    it('merge(array) merges data at root', function () {
        $acc = SafeAccess::fromArray(['a' => 1, 'b' => 2]);
        $merged = $acc->merge(['c' => 3, 'b' => 99]);
        expect($merged->get('a'))->toBe(1);
        expect($merged->get('b'))->toBe(99);
        expect($merged->get('c'))->toBe(3);
    });
});
