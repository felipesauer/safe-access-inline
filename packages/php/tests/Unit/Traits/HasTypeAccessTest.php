<?php

declare(strict_types=1);

use SafeAccessInline\Accessors\ArrayAccessor;
use SafeAccessInline\Traits\HasTypeAccess;

describe(HasTypeAccess::class, function () {

    // ── getInt ────────────────────────────────────────────────────────────────

    describe('getInt', function () {
        it('returns int value for an integer field', function () {
            $acc = ArrayAccessor::from(['port' => 3000]);
            expect($acc->getInt('port'))->toBe(3000);
        });

        it('truncates float to int', function () {
            $acc = ArrayAccessor::from(['v' => 3.9]);
            expect($acc->getInt('v'))->toBe(3);
        });

        it('coerces numeric string to int', function () {
            $acc = ArrayAccessor::from(['port' => '8080']);
            expect($acc->getInt('port'))->toBe(8080);
        });

        it('returns default 0 for missing path', function () {
            $acc = ArrayAccessor::from([]);
            expect($acc->getInt('missing'))->toBe(0);
        });

        it('returns custom default for missing path', function () {
            $acc = ArrayAccessor::from([]);
            expect($acc->getInt('missing', 42))->toBe(42);
        });

        it('returns default for non-numeric string', function () {
            $acc = ArrayAccessor::from(['v' => 'hello']);
            expect($acc->getInt('v'))->toBe(0);
        });

        it('returns default for null value', function () {
            $acc = ArrayAccessor::from(['v' => null]);
            expect($acc->getInt('v', 99))->toBe(99);
        });
    });

    // ── getBool ───────────────────────────────────────────────────────────────

    describe('getBool', function () {
        it('returns true for boolean true', function () {
            $acc = ArrayAccessor::from(['flag' => true]);
            expect($acc->getBool('flag'))->toBeTrue();
        });

        it('returns false for boolean false', function () {
            $acc = ArrayAccessor::from(['flag' => false]);
            expect($acc->getBool('flag'))->toBeFalse();
        });

        it('coerces string "true" to true', function () {
            $acc = ArrayAccessor::from(['v' => 'true']);
            expect($acc->getBool('v'))->toBeTrue();
        });

        it('coerces string "1" to true', function () {
            $acc = ArrayAccessor::from(['v' => '1']);
            expect($acc->getBool('v'))->toBeTrue();
        });

        it('coerces string "yes" to true', function () {
            $acc = ArrayAccessor::from(['v' => 'yes']);
            expect($acc->getBool('v'))->toBeTrue();
        });

        it('coerces string "false" to false', function () {
            $acc = ArrayAccessor::from(['v' => 'false']);
            expect($acc->getBool('v'))->toBeFalse();
        });

        it('coerces string "0" to false', function () {
            $acc = ArrayAccessor::from(['v' => '0']);
            expect($acc->getBool('v'))->toBeFalse();
        });

        it('coerces string "no" to false', function () {
            $acc = ArrayAccessor::from(['v' => 'no']);
            expect($acc->getBool('v'))->toBeFalse();
        });

        it('returns true for non-zero numeric value', function () {
            $acc = ArrayAccessor::from(['v' => 5]);
            expect($acc->getBool('v'))->toBeTrue();
        });

        it('returns false for zero numeric value', function () {
            $acc = ArrayAccessor::from(['v' => 0]);
            expect($acc->getBool('v'))->toBeFalse();
        });

        it('returns default for missing path', function () {
            $acc = ArrayAccessor::from([]);
            expect($acc->getBool('missing'))->toBeFalse();
            expect($acc->getBool('missing', true))->toBeTrue();
        });

        it('returns default for unrecognised string', function () {
            $acc = ArrayAccessor::from(['v' => 'maybe']);
            expect($acc->getBool('v', true))->toBeTrue();
        });
    });

    // ── getString ─────────────────────────────────────────────────────────────

    describe('getString', function () {
        it('returns string value', function () {
            $acc = ArrayAccessor::from(['name' => 'Ana']);
            expect($acc->getString('name'))->toBe('Ana');
        });

        it('coerces integer to string', function () {
            $acc = ArrayAccessor::from(['n' => 42]);
            expect($acc->getString('n'))->toBe('42');
        });

        it('coerces boolean to string', function () {
            $acc = ArrayAccessor::from(['b' => true]);
            expect($acc->getString('b'))->toBe('1');
        });

        it('returns empty string default for missing path', function () {
            $acc = ArrayAccessor::from([]);
            expect($acc->getString('missing'))->toBe('');
        });

        it('returns custom default for null value', function () {
            $acc = ArrayAccessor::from(['v' => null]);
            expect($acc->getString('v', 'fallback'))->toBe('fallback');
        });

        it('returns default for array value', function () {
            $acc = ArrayAccessor::from(['v' => [1, 2, 3]]);
            expect($acc->getString('v', 'default'))->toBe('default');
        });
    });

    // ── getArray ──────────────────────────────────────────────────────────────

    describe('getArray', function () {
        it('returns array value', function () {
            $acc = ArrayAccessor::from(['items' => [1, 2, 3]]);
            expect($acc->getArray('items'))->toBe([1, 2, 3]);
        });

        it('returns empty array default for missing path', function () {
            $acc = ArrayAccessor::from([]);
            expect($acc->getArray('missing'))->toBe([]);
        });

        it('returns default for non-array value', function () {
            $acc = ArrayAccessor::from(['v' => 'hello']);
            expect($acc->getArray('v', ['default']))->toBe(['default']);
        });

        it('returns custom default for null value', function () {
            $acc = ArrayAccessor::from(['v' => null]);
            expect($acc->getArray('v', ['fallback']))->toBe(['fallback']);
        });
    });

    // ── getFloat ──────────────────────────────────────────────────────────────

    describe('getFloat', function () {
        it('returns float value', function () {
            $acc = ArrayAccessor::from(['price' => 3.14]);
            expect($acc->getFloat('price'))->toBe(3.14);
        });

        it('coerces numeric string to float', function () {
            $acc = ArrayAccessor::from(['price' => '9.99']);
            expect($acc->getFloat('price'))->toBe(9.99);
        });

        it('coerces integer to float', function () {
            $acc = ArrayAccessor::from(['v' => 5]);
            expect($acc->getFloat('v'))->toBe(5.0);
        });

        it('returns default 0.0 for missing path', function () {
            $acc = ArrayAccessor::from([]);
            expect($acc->getFloat('missing'))->toBe(0.0);
        });

        it('returns default for non-numeric string', function () {
            $acc = ArrayAccessor::from(['v' => 'text']);
            expect($acc->getFloat('v', 1.5))->toBe(1.5);
        });
    });
});
