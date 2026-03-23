<?php

declare(strict_types=1);

use SafeAccessInline\Contracts\JsonPatchOperation;
use SafeAccessInline\Core\Operations\JsonPatch;
use SafeAccessInline\Exceptions\JsonPatchTestFailedException;
use SafeAccessInline\Exceptions\ReadonlyViolationException;
use SafeAccessInline\SafeAccess;

describe(JsonPatch::class, function () {

    // ── diff() ────────────────────────────────

    it('detects added keys', function () {
        $ops = JsonPatch::diff(['a' => 1], ['a' => 1, 'b' => 2]);
        expect($ops)->toHaveCount(1);
        expect($ops[0])->toBeInstanceOf(JsonPatchOperation::class);
        expect($ops[0]->op)->toBe('add');
        expect($ops[0]->path)->toBe('/b');
        expect($ops[0]->value)->toBe(2);
    });

    it('detects removed keys', function () {
        $ops = JsonPatch::diff(['a' => 1, 'b' => 2], ['a' => 1]);
        expect($ops)->toHaveCount(1);
        expect($ops[0]->op)->toBe('remove');
        expect($ops[0]->path)->toBe('/b');
    });

    it('detects replaced values', function () {
        $ops = JsonPatch::diff(['a' => 1], ['a' => 2]);
        expect($ops)->toHaveCount(1);
        expect($ops[0]->op)->toBe('replace');
        expect($ops[0]->path)->toBe('/a');
        expect($ops[0]->value)->toBe(2);
    });

    it('diffs nested objects recursively', function () {
        $a = ['user' => ['name' => 'Ana', 'age' => 30]];
        $b = ['user' => ['name' => 'Ana', 'age' => 31]];
        $ops = JsonPatch::diff($a, $b);
        expect($ops)->toHaveCount(1);
        expect($ops[0]->op)->toBe('replace');
        expect($ops[0]->path)->toBe('/user/age');
        expect($ops[0]->value)->toBe(31);
    });

    it('returns empty for identical objects', function () {
        $ops = JsonPatch::diff(['a' => 1, 'b' => ['c' => 2]], ['a' => 1, 'b' => ['c' => 2]]);
        expect($ops)->toBe([]);
    });

    it('deepEqual — returns true for same-content arrays with different key insertion order (line 302)', function () {
        // In PHP, ['a'=>1,'b'=>2] !== ['b'=>2,'a'=>1] strictly (key order differs),
        // so deepEqual() cannot short-circuit at the `$a === $b` check (line 288).
        // It must iterate all keys and reach `return true` at line 302.
        $ops = JsonPatch::diff(['a' => 1, 'b' => 2], ['b' => 2, 'a' => 1]);
        expect($ops)->toBe([]);
    });

    // ── list-array diffs (diffArrays) ───────────

    it('diffs list arrays - added elements', function () {
        $a = ['items' => [1, 2]];
        $b = ['items' => [1, 2, 3]];
        $ops = JsonPatch::diff($a, $b);
        expect($ops)->toHaveCount(1);
        expect($ops[0]->op)->toBe('add');
        expect($ops[0]->path)->toBe('/items/2');
        expect($ops[0]->value)->toBe(3);
    });

    it('diffs list arrays - removed elements', function () {
        $a = ['items' => [1, 2, 3]];
        $b = ['items' => [1, 2]];
        $ops = JsonPatch::diff($a, $b);
        expect($ops)->toHaveCount(1);
        expect($ops[0]->op)->toBe('remove');
    });

    it('diffs list arrays - replaced elements', function () {
        $a = ['items' => ['a', 'b']];
        $b = ['items' => ['a', 'c']];
        $ops = JsonPatch::diff($a, $b);
        expect($ops)->toHaveCount(1);
        expect($ops[0]->op)->toBe('replace');
        expect($ops[0]->path)->toBe('/items/1');
        expect($ops[0]->value)->toBe('c');
    });

    it('diffs nested objects inside list arrays', function () {
        $a = ['users' => [['name' => 'Ana'], ['name' => 'Bob']]];
        $b = ['users' => [['name' => 'Ana'], ['name' => 'Carlos']]];
        $ops = JsonPatch::diff($a, $b);
        expect($ops)->toHaveCount(1);
        expect($ops[0]->op)->toBe('replace');
        expect($ops[0]->path)->toBe('/users/1/name');
        expect($ops[0]->value)->toBe('Carlos');
    });

    // ── pointer escaping ────────────────────────

    it('escapes tilde in key names', function () {
        $a = ['a~b' => 1];
        $b = ['a~b' => 2];
        $ops = JsonPatch::diff($a, $b);
        expect($ops)->toHaveCount(1);
        expect($ops[0]->op)->toBe('replace');
        expect($ops[0]->path)->toBe('/a~0b');
        expect($ops[0]->value)->toBe(2);
    });

    it('escapes slash in key names', function () {
        $a = ['a/b' => 1];
        $b = ['a/b' => 2];
        $ops = JsonPatch::diff($a, $b);
        expect($ops)->toHaveCount(1);
        expect($ops[0]->op)->toBe('replace');
        expect($ops[0]->path)->toBe('/a~1b');
        expect($ops[0]->value)->toBe(2);
    });

    it('apply patch with pointer-escaped keys', function () {
        $result = JsonPatch::applyPatch(
            ['a/b' => 1],
            [new JsonPatchOperation(op: 'replace', path: '/a~1b', value: 99)],
        );
        expect($result)->toBe(['a/b' => 99]);
    });

    // ── applyPatch() ─────────────────────────────

    it('applies add operation', function () {
        $result = JsonPatch::applyPatch(
            ['a' => 1],
            [new JsonPatchOperation(op: 'add', path: '/b', value: 2)],
        );
        expect($result)->toBe(['a' => 1, 'b' => 2]);
    });

    it('applies remove operation', function () {
        $result = JsonPatch::applyPatch(
            ['a' => 1, 'b' => 2],
            [new JsonPatchOperation(op: 'remove', path: '/b')],
        );
        expect($result)->toBe(['a' => 1]);
    });

    it('applies replace operation', function () {
        $result = JsonPatch::applyPatch(
            ['a' => 1],
            [new JsonPatchOperation(op: 'replace', path: '/a', value: 99)],
        );
        expect($result)->toBe(['a' => 99]);
    });

    it('applies move operation', function () {
        $result = JsonPatch::applyPatch(
            ['a' => 1, 'b' => 2],
            [new JsonPatchOperation(op: 'move', path: '/c', from: '/a')],
        );
        expect($result)->toHaveKey('b', 2);
        expect($result)->toHaveKey('c', 1);
        expect($result)->not->toHaveKey('a');
    });

    it('applies copy operation', function () {
        $result = JsonPatch::applyPatch(
            ['a' => 1],
            [new JsonPatchOperation(op: 'copy', path: '/b', from: '/a')],
        );
        expect($result)->toBe(['a' => 1, 'b' => 1]);
    });

    it('test operation succeeds for matching value', function () {
        $result = JsonPatch::applyPatch(
            ['a' => 1],
            [new JsonPatchOperation(op: 'test', path: '/a', value: 1)],
        );
        expect($result)->toBe(['a' => 1]);
    });

    it('test operation fails for non-matching value', function () {
        JsonPatch::applyPatch(
            ['a' => 1],
            [new JsonPatchOperation(op: 'test', path: '/a', value: 999)],
        );
    })->throws(JsonPatchTestFailedException::class);

    it('test operation failure is instanceof RuntimeException', function () {
        try {
            JsonPatch::applyPatch(
                ['a' => 1],
                [new JsonPatchOperation(op: 'test', path: '/a', value: 999)],
            );
        } catch (\Throwable $e) {
            expect($e)->toBeInstanceOf(JsonPatchTestFailedException::class);
            expect($e)->toBeInstanceOf(\RuntimeException::class);
            expect($e->getMessage())->toContain('Test operation failed');
        }
    });

    it('applies multiple operations', function () {
        $ops = [
            new JsonPatchOperation(op: 'add', path: '/b', value: 2),
            new JsonPatchOperation(op: 'replace', path: '/a', value: 10),
            new JsonPatchOperation(op: 'remove', path: '/b'),
        ];
        $result = JsonPatch::applyPatch(['a' => 1], $ops);
        expect($result)->toBe(['a' => 10]);
    });

    it('throws when move operation is missing from field', function () {
        JsonPatch::applyPatch(
            ['a' => 1],
            [new JsonPatchOperation(op: 'move', path: '/b')],
        );
    })->throws(\InvalidArgumentException::class, "'from' field");

    it('throws when copy operation is missing from field', function () {
        JsonPatch::applyPatch(
            ['a' => 1],
            [new JsonPatchOperation(op: 'copy', path: '/b')],
        );
    })->throws(\InvalidArgumentException::class, "'from' field");

    it('applies add to append to array with dash pointer', function () {
        $result = JsonPatch::applyPatch(
            ['items' => [1, 2]],
            [new JsonPatchOperation(op: 'add', path: '/items/-', value: 3)],
        );
        expect($result['items'])->toBe([1, 2, 3]);
    });

    it('move operation on nested path', function () {
        $data = ['a' => ['x' => 1], 'b' => ['y' => 2]];
        $result = JsonPatch::applyPatch($data, [
            new JsonPatchOperation(op: 'move', path: '/b/z', from: '/a/x'),
        ]);
        expect($result['b']['z'])->toBe(1);
        expect($result['a'])->not->toHaveKey('x');
    });

    it('copy operation on nested path', function () {
        $data = ['a' => ['x' => 1]];
        $result = JsonPatch::applyPatch($data, [
            new JsonPatchOperation(op: 'copy', path: '/b', from: '/a/x'),
        ]);
        expect($result['a']['x'])->toBe(1);
        expect($result['b'])->toBe(1);
    });

    it('remove from list array reindexes', function () {
        $result = JsonPatch::applyPatch(
            ['items' => ['a', 'b', 'c']],
            [new JsonPatchOperation(op: 'remove', path: '/items/1')],
        );
        expect($result['items'])->toBe(['a', 'c']);
    });

    it('setAtPointer creates intermediate keys', function () {
        $result = JsonPatch::applyPatch(
            [],
            [new JsonPatchOperation(op: 'add', path: '/a/b/c', value: 42)],
        );
        expect($result['a']['b']['c'])->toBe(42);
    });

    // ── JsonPatchOperation DTO ────────────────────────────

    it('JsonPatchOperation — constructor stores op, path, value and from', function () {
        $op = new JsonPatchOperation(
            op:    'replace',
            path:  '/user/name',
            value: 'Bob',
            from:  null,
        );

        expect($op->op)->toBe('replace')
            ->and($op->path)->toBe('/user/name')
            ->and($op->value)->toBe('Bob')
            ->and($op->from)->toBeNull();
    });

    it('JsonPatchOperation — constructor stores from field for move/copy ops', function () {
        $op = new JsonPatchOperation(op: 'move', path: '/b', from: '/a');

        expect($op->op)->toBe('move')
            ->and($op->from)->toBe('/a')
            ->and($op->value)->toBeNull();
    });

    it('remove at nonexistent nested path is safe', function () {
        $result = JsonPatch::applyPatch(
            ['a' => 1],
            [new JsonPatchOperation(op: 'remove', path: '/x/y/z')],
        );
        expect($result)->toBe(['a' => 1]);
    });

    it('getAtPointer resolves numeric keys in list arrays', function () {
        $result = JsonPatch::applyPatch(
            ['items' => ['a', 'b', 'c']],
            [new JsonPatchOperation(op: 'test', path: '/items/1', value: 'b')],
        );
        expect($result['items'])->toBe(['a', 'b', 'c']);
    });

    it('remove at root pointer returns empty array', function () {
        $result = JsonPatch::applyPatch(
            ['a' => 1, 'b' => 2],
            [new JsonPatchOperation(op: 'remove', path: '')],
        );
        expect($result)->toBe([]);
    });

    it('replace at root pointer with array value', function () {
        $result = JsonPatch::applyPatch(
            ['a' => 1],
            [new JsonPatchOperation(op: 'replace', path: '', value: ['b' => 2])],
        );
        expect($result)->toBe(['b' => 2]);
    });

    // ── getAtPointer — null when traversing through a scalar ────

    it('getAtPointer — returns null when intermediate is a non-array value', function () {
        // 'a' is scalar 42; accessing '/a/nested' returns null via the else branch
        $result = JsonPatch::applyPatch(
            ['a' => 42],
            [new JsonPatchOperation(op: 'copy', path: '/b', from: '/a/nested')],
        );
        expect($result)->toHaveKey('b');
        expect($result['b'])->toBeNull();
    });

    // ── deepEqual — false when types differ (array vs scalar) ───

    it('deepEqual — returns false and test-op throws when array compared to scalar', function () {
        JsonPatch::applyPatch(
            ['a' => 42],
            [new JsonPatchOperation(op: 'test', path: '/a', value: ['not' => 'a scalar'])],
        );
    })->throws(JsonPatchTestFailedException::class);

    it('applies operations correctly when no test ops present', function () {
        $result = JsonPatch::applyPatch(
            ['a' => 1, 'b' => 2],
            [
                new JsonPatchOperation(op: 'replace', path: '/a', value: 99),
                new JsonPatchOperation(op: 'remove', path: '/b'),
                new JsonPatchOperation(op: 'add', path: '/c', value: 'new'),
            ],
        );
        expect($result)->toBe(['a' => 99, 'c' => 'new']);
    });

    it('applies test + non-test ops atomically', function () {
        $data   = ['a' => 1, 'b' => 2];
        $result = JsonPatch::applyPatch(
            $data,
            [
                new JsonPatchOperation(op: 'test', path: '/a', value: 1),
                new JsonPatchOperation(op: 'replace', path: '/b', value: 99),
            ],
        );
        expect($result)->toBe(['a' => 1, 'b' => 99]);
    });

    it('aborts all ops when test op fails (atomicity)', function () {
        JsonPatch::applyPatch(
            ['a' => 1, 'b' => 2],
            [
                new JsonPatchOperation(op: 'replace', path: '/b', value: 99),
                new JsonPatchOperation(op: 'test', path: '/a', value: 999), // wrong value — should fail
            ],
        );
    })->throws(JsonPatchTestFailedException::class);
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
        expect($ops)->toHaveCount(1);
        expect($ops[0])->toBeInstanceOf(JsonPatchOperation::class);
        expect($ops[0]->op)->toBe('replace');
        expect($ops[0]->path)->toBe('/age');
        expect($ops[0]->value)->toBe(31);
    });

    it('applyPatch applies patch to accessor', function () {
        $acc = SafeAccess::fromJson('{"name":"Ana","age":30}');
        $patched = $acc->applyPatch([new JsonPatchOperation(op: 'replace', path: '/age', value: 31)]);
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

    it('merge(string, array) merges data at specific path', function () {
        $acc = SafeAccess::fromArray(['a' => ['x' => 1]]);
        $merged = $acc->merge('a', ['y' => 2]);
        expect($merged->get('a.x'))->toBe(1);
        expect($merged->get('a.y'))->toBe(2);
    });

    it('diff produces empty patch when arrays have same keys in different order', function () {
        $a = ['x' => ['a' => 1, 'b' => 2]];
        $b = ['x' => ['b' => 2, 'a' => 1]];
        $ops = JsonPatch::diff($a, $b);
        expect($ops)->toBe([]);
    });

});

describe('JsonPatch test op — absent path', function () {

    it('test op on absent top-level path throws JsonPatchTestFailedException', function () {
        JsonPatch::applyPatch(
            ['a' => 1],
            [new JsonPatchOperation(op: 'test', path: '/missing', value: null)],
        );
    })->throws(JsonPatchTestFailedException::class);

    it('test op on absent nested path throws JsonPatchTestFailedException', function () {
        JsonPatch::applyPatch(
            ['a' => ['b' => 1]],
            [new JsonPatchOperation(op: 'test', path: '/a/missing', value: null)],
        );
    })->throws(JsonPatchTestFailedException::class);

    it('test op on deeply absent path throws JsonPatchTestFailedException', function () {
        JsonPatch::applyPatch(
            [],
            [new JsonPatchOperation(op: 'test', path: '/x/y/z', value: 0)],
        );
    })->throws(JsonPatchTestFailedException::class);

    it('test op on existing key with null value passes when expected null', function () {
        $result = JsonPatch::applyPatch(
            ['a' => null],
            [new JsonPatchOperation(op: 'test', path: '/a', value: null)],
        );
        expect($result)->toBe(['a' => null]);
    });

    it('test op on existing key with falsy-zero passes when expected zero', function () {
        $result = JsonPatch::applyPatch(
            ['count' => 0],
            [new JsonPatchOperation(op: 'test', path: '/count', value: 0)],
        );
        expect($result)->toBe(['count' => 0]);
    });

});
