<?php

use SafeAccessInline\Exceptions\SecurityException;
use SafeAccessInline\Security\SecurityOptions;

describe(SecurityOptions::class, function () {

    describe('assertPayloadSize', function () {
        it('allows payload within limits', function () {
            expect(fn () => SecurityOptions::assertPayloadSize('hello'))->not->toThrow(SecurityException::class);
        });

        it('throws for payload exceeding custom limit', function () {
            expect(fn () => SecurityOptions::assertPayloadSize('hello world', 5))
                ->toThrow(SecurityException::class, 'exceeds maximum');
        });

        it('allows payload at exact limit', function () {
            expect(fn () => SecurityOptions::assertPayloadSize('hello', 5))->not->toThrow(SecurityException::class);
        });
    });

    describe('assertMaxKeys', function () {
        it('allows data within key limits', function () {
            expect(fn () => SecurityOptions::assertMaxKeys(['a' => 1, 'b' => 2]))->not->toThrow(SecurityException::class);
        });

        it('throws when key count exceeds limit', function () {
            $data = [];
            for ($i = 0; $i < 11; $i++) {
                $data["k{$i}"] = $i;
            }
            expect(fn () => SecurityOptions::assertMaxKeys($data, 5))
                ->toThrow(SecurityException::class, 'exceeding maximum');
        });

        it('counts nested keys', function () {
            $data = ['a' => ['b' => ['c' => 1]]];
            expect(fn () => SecurityOptions::assertMaxKeys($data, 2))
                ->toThrow(SecurityException::class);
        });
    });

    describe('assertMaxDepth', function () {
        it('allows depth within limits', function () {
            expect(fn () => SecurityOptions::assertMaxDepth(10))->not->toThrow(SecurityException::class);
        });

        it('throws when depth exceeds default limit', function () {
            expect(fn () => SecurityOptions::assertMaxDepth(513))
                ->toThrow(SecurityException::class);
        });

        it('throws when depth exceeds custom limit', function () {
            expect(fn () => SecurityOptions::assertMaxDepth(11, 10))
                ->toThrow(SecurityException::class, 'exceeds maximum');
        });

        it('allows depth at exact limit', function () {
            expect(fn () => SecurityOptions::assertMaxDepth(512))->not->toThrow(SecurityException::class);
        });
    });
});
