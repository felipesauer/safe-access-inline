<?php

use SafeAccessInline\Exceptions\InvalidFormatException;
use SafeAccessInline\SafeAccess;

$data = json_encode([
    'users' => [
        ['name' => 'Ana', 'age' => 30],
        ['name' => 'Bob', 'age' => 25],
        ['name' => 'Carlos', 'age' => 30],
    ],
    'tags' => ['js', 'ts', 'node'],
    'nested' => [[1, 2], [3, 4], [5]],
    'numbers' => [3, 1, 4, 1, 5, 9, 2, 6],
]);

describe('Array Operations', function () use (&$data) {

    // ── push / pop / shift / unshift ─────────────

    it('push appends items', function () use (&$data) {
        $acc = SafeAccess::fromJson($data);
        $result = $acc->push('tags', 'deno', 'bun');
        expect($result->get('tags'))->toBe(['js', 'ts', 'node', 'deno', 'bun']);
    });

    it('pop removes last element', function () use (&$data) {
        $acc = SafeAccess::fromJson($data);
        $result = $acc->pop('tags');
        expect($result->get('tags'))->toBe(['js', 'ts']);
    });

    it('shift removes first element', function () use (&$data) {
        $acc = SafeAccess::fromJson($data);
        $result = $acc->shift('tags');
        expect($result->get('tags'))->toBe(['ts', 'node']);
    });

    it('unshift prepends items', function () use (&$data) {
        $acc = SafeAccess::fromJson($data);
        $result = $acc->unshift('tags', 'deno', 'bun');
        expect($result->get('tags'))->toBe(['deno', 'bun', 'js', 'ts', 'node']);
    });

    // ── insert ─────────────────────────────────────

    it('insert at positive index', function () use (&$data) {
        $acc = SafeAccess::fromJson($data);
        $result = $acc->insert('tags', 1, 'deno');
        expect($result->get('tags'))->toBe(['js', 'deno', 'ts', 'node']);
    });

    it('insert at negative index', function () use (&$data) {
        $acc = SafeAccess::fromJson($data);
        $result = $acc->insert('tags', -1, 'deno');
        expect($result->get('tags'))->toBe(['js', 'ts', 'deno', 'node']);
    });

    // ── filterAt ───────────────────────────────────

    it('filterAt filters array elements', function () use (&$data) {
        $acc = SafeAccess::fromJson($data);
        $result = $acc->filterAt('users', fn ($u) => $u['age'] === 30);
        $users = $result->get('users');
        expect(count($users))->toBe(2);
        expect($users[0]['name'])->toBe('Ana');
        expect($users[1]['name'])->toBe('Carlos');
    });

    // ── mapAt ──────────────────────────────────────

    it('mapAt transforms array elements', function () use (&$data) {
        $acc = SafeAccess::fromJson($data);
        $result = $acc->mapAt('tags', fn ($t) => strtoupper($t));
        expect($result->get('tags'))->toBe(['JS', 'TS', 'NODE']);
    });

    // ── sortAt ─────────────────────────────────────

    it('sortAt sorts primitives ascending', function () use (&$data) {
        $acc = SafeAccess::fromJson($data);
        $result = $acc->sortAt('numbers');
        expect($result->get('numbers'))->toBe([1, 1, 2, 3, 4, 5, 6, 9]);
    });

    it('sortAt sorts primitives descending', function () use (&$data) {
        $acc = SafeAccess::fromJson($data);
        $result = $acc->sortAt('numbers', null, 'desc');
        expect($result->get('numbers'))->toBe([9, 6, 5, 4, 3, 2, 1, 1]);
    });

    it('sortAt sorts by key', function () use (&$data) {
        $acc = SafeAccess::fromJson($data);
        $result = $acc->sortAt('users', 'name');
        $users = $result->get('users');
        expect(array_column($users, 'name'))->toBe(['Ana', 'Bob', 'Carlos']);
    });

    // ── unique ─────────────────────────────────────

    it('unique removes duplicate primitives', function () use (&$data) {
        $acc = SafeAccess::fromJson($data);
        $result = $acc->unique('numbers');
        expect($result->get('numbers'))->toBe([3, 1, 4, 5, 9, 2, 6]);
    });

    it('unique removes duplicates by key', function () use (&$data) {
        $acc = SafeAccess::fromJson($data);
        $result = $acc->unique('users', 'age');
        expect(count($result->get('users')))->toBe(2);
    });

    // ── flatten ────────────────────────────────────

    it('flatten by default depth 1', function () use (&$data) {
        $acc = SafeAccess::fromJson($data);
        $result = $acc->flatten('nested');
        expect($result->get('nested'))->toBe([1, 2, 3, 4, 5]);
    });

    // ── first / last / nth ─────────────────────────

    it('first returns first element', function () use (&$data) {
        $acc = SafeAccess::fromJson($data);
        expect($acc->first('tags'))->toBe('js');
    });

    it('first returns default for empty', function () {
        $acc = SafeAccess::fromJson('{"empty":[]}');
        expect($acc->first('empty', 'fallback'))->toBe('fallback');
    });

    it('last returns last element', function () use (&$data) {
        $acc = SafeAccess::fromJson($data);
        expect($acc->last('tags'))->toBe('node');
    });

    it('nth returns element at index', function () use (&$data) {
        $acc = SafeAccess::fromJson($data);
        expect($acc->nth('tags', 1))->toBe('ts');
    });

    it('nth supports negative index', function () use (&$data) {
        $acc = SafeAccess::fromJson($data);
        expect($acc->nth('tags', -1))->toBe('node');
    });

    it('nth returns default for out-of-range', function () use (&$data) {
        $acc = SafeAccess::fromJson($data);
        expect($acc->nth('tags', 99, 'none'))->toBe('none');
    });

    // ── immutability ───────────────────────────────

    it('all operations are immutable', function () use (&$data) {
        $acc = SafeAccess::fromJson($data);
        $original = $acc->get('tags');
        $acc->push('tags', 'new');
        expect($acc->get('tags'))->toBe($original);
    });

    // ── error cases ────────────────────────────────

    it('throws on non-array path', function () use (&$data) {
        $acc = SafeAccess::fromJson($data);
        $acc->push('users.0.name', 'item');
    })->throws(InvalidFormatException::class);
});
