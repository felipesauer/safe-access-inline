<?php

use SafeAccessInline\Core\DotNotationParser;
use SafeAccessInline\Exceptions\SecurityException;
use SafeAccessInline\Security\SecurityGuard;

describe(SecurityGuard::class, function () {

    // ── assertSafeKey ────────────────────────────────

    it('allows normal keys', function () {
        SecurityGuard::assertSafeKey('name');
        SecurityGuard::assertSafeKey('user');
        SecurityGuard::assertSafeKey('0');
        SecurityGuard::assertSafeKey('__name');
        expect(true)->toBeTrue(); // no exception
    });

    it('blocks __proto__', function () {
        SecurityGuard::assertSafeKey('__proto__');
    })->throws(SecurityException::class);

    it('blocks constructor', function () {
        SecurityGuard::assertSafeKey('constructor');
    })->throws(SecurityException::class);

    it('blocks prototype', function () {
        SecurityGuard::assertSafeKey('prototype');
    })->throws(SecurityException::class);

    // ── sanitizeObject ───────────────────────────────

    it('removes __proto__ keys recursively', function () {
        $input = ['a' => 1, '__proto__' => ['evil' => true], 'nested' => ['__proto__' => ['x' => 1], 'b' => 2]];
        $result = SecurityGuard::sanitizeObject($input);
        expect($result)->toBe(['a' => 1, 'nested' => ['b' => 2]]);
    });

    it('removes constructor and prototype keys', function () {
        $input = ['constructor' => 'evil', 'prototype' => 'evil', 'safe' => 'ok'];
        $result = SecurityGuard::sanitizeObject($input);
        expect($result)->toBe(['safe' => 'ok']);
    });

    it('handles numeric keys', function () {
        $input = [0 => ['__proto__' => ['x' => 1], 'a' => 1], 1 => ['b' => 2]];
        $result = SecurityGuard::sanitizeObject($input);
        expect($result)->toBe([0 => ['a' => 1], 1 => ['b' => 2]]);
    });
});

describe('Prototype Pollution Protection in DotNotationParser', function () {

    it('set — blocks __proto__ path', function () {
        DotNotationParser::set([], '__proto__.polluted', true);
    })->throws(SecurityException::class);

    it('set — blocks constructor path', function () {
        DotNotationParser::set([], 'constructor.polluted', true);
    })->throws(SecurityException::class);

    it('set — blocks prototype path', function () {
        DotNotationParser::set([], 'a.prototype.polluted', true);
    })->throws(SecurityException::class);

    it('set — blocks __proto__ as final key', function () {
        DotNotationParser::set([], 'a.__proto__', 'evil');
    })->throws(SecurityException::class);

    it('merge — blocks __proto__ in source keys', function () {
        DotNotationParser::merge(['a' => ['b' => 1]], '', ['__proto__' => ['polluted' => true]]);
    })->throws(SecurityException::class);

    it('merge — blocks constructor in source keys', function () {
        DotNotationParser::merge([], '', ['constructor' => ['polluted' => true]]);
    })->throws(SecurityException::class);

    it('set — allows normal nested paths', function () {
        $result = DotNotationParser::set([], 'user.name', 'Ana');
        expect($result)->toBe(['user' => ['name' => 'Ana']]);
    });
});
