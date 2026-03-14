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
