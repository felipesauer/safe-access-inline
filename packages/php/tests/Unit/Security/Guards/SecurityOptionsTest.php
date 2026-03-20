<?php

declare(strict_types=1);

use SafeAccessInline\Exceptions\SecurityException;
use SafeAccessInline\Security\Guards\SecurityOptions;

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

    describe('assertMaxKeys with deep nesting', function () {
        it('stops counting keys beyond depth 100', function () {
            // Build nested structure >100 levels deep
            $data = ['inner' => 'leaf'];
            for ($i = 0; $i < 105; $i++) {
                $data = ['k' . $i => $data];
            }
            // Should not throw — countKeys bails at depth > 100
            expect(fn () => SecurityOptions::assertMaxKeys($data, 200))->not->toThrow(SecurityException::class);
        });

        it('accepts a custom maxCountDepth override', function () {
            $data = ['leaf' => true];
            for ($i = 0; $i < 5; $i++) {
                $data = ['level' . $i => $data];
            }

            expect(fn () => SecurityOptions::assertMaxKeys($data, 10, 2))->not->toThrow(SecurityException::class);
            expect(fn () => SecurityOptions::assertMaxKeys($data, 2, 10))->toThrow(SecurityException::class);
        });
    });

    // ── Edge cases: large payloads ──────────────────────

    describe('large payload edge cases', function () {
        it('rejects payload exceeding 10 MB', function () {
            $tenMB = 10 * 1024 * 1024;
            $payload = str_repeat('x', $tenMB + 1);
            expect(fn () => SecurityOptions::assertPayloadSize($payload, $tenMB))
                ->toThrow(SecurityException::class, 'Payload size');
        });

        it('allows payload at exactly 10 MB', function () {
            $tenMB = 10 * 1024 * 1024;
            $payload = str_repeat('x', $tenMB);
            expect(fn () => SecurityOptions::assertPayloadSize($payload, $tenMB))
                ->not->toThrow(SecurityException::class);
        });

        it('assertMaxKeys handles object with thousands of keys', function () {
            $big = [];
            for ($i = 0; $i < 5000; $i++) {
                $big['k' . $i] = $i;
            }
            expect(fn () => SecurityOptions::assertMaxKeys($big, 5000))->not->toThrow(SecurityException::class);
            expect(fn () => SecurityOptions::assertMaxKeys($big, 4999))->toThrow(SecurityException::class);
        });

        it('assertMaxStructuralDepth rejects extremely deep nesting', function () {
            $deep = ['leaf' => true];
            for ($i = 0; $i < 50; $i++) {
                $deep = ['n' => $deep];
            }
            expect(fn () => SecurityOptions::assertMaxStructuralDepth($deep, 10))
                ->toThrow(SecurityException::class);
        });
    });
});
