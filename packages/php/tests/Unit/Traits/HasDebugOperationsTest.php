<?php

declare(strict_types=1);

use SafeAccessInline\Accessors\ArrayAccessor;
use SafeAccessInline\Contracts\TraceSegment;
use SafeAccessInline\Traits\HasDebugOperations;

describe(HasDebugOperations::class, function () {

    describe('trace', function () {
        it('returns found:true for all segments of an existing path', function () {
            $acc = ArrayAccessor::from(['user' => ['address' => ['city' => 'São Paulo']]]);
            $result = $acc->trace('user.address.city');

            expect($result)->toHaveCount(3);
            expect($result[0])->toEqual(new TraceSegment('user', true, 'object'));
            expect($result[1])->toEqual(new TraceSegment('address', true, 'object'));
            expect($result[2])->toEqual(new TraceSegment('city', true, 'string'));
        });

        it('returns found:false for the first missing segment and fills remaining', function () {
            $acc = ArrayAccessor::from(['user' => ['name' => 'Ana']]);
            $result = $acc->trace('user.address.city');

            expect($result)->toHaveCount(3);
            expect($result[0])->toEqual(new TraceSegment('user', true, 'object'));
            expect($result[1])->toEqual(new TraceSegment('address', false, null));
            expect($result[2])->toEqual(new TraceSegment('city', false, null));
        });

        it('does not throw for an entirely invalid path', function () {
            $acc = ArrayAccessor::from([]);
            $result = $acc->trace('a.b.c');
            expect($result)->toBeArray();
        });

        it('reports correct types for found segments', function () {
            $acc = ArrayAccessor::from([
                'n'   => 42,
                'f'   => 3.14,
                'b'   => true,
                'a'   => [1, 2, 3],
                'o'   => ['x' => 1],
                'nil' => null,
                's'   => 'hello',
            ]);

            expect($acc->trace('n')[0]->type)->toBe('number');
            expect($acc->trace('f')[0]->type)->toBe('number');
            expect($acc->trace('b')[0]->type)->toBe('boolean');
            expect($acc->trace('a')[0]->type)->toBe('array');
            expect($acc->trace('o')[0]->type)->toBe('object');
            expect($acc->trace('nil')[0]->type)->toBe('null');
            expect($acc->trace('s')[0]->type)->toBe('string');
        });

        it('returns empty array for empty path', function () {
            $acc = ArrayAccessor::from(['a' => 1]);
            expect($acc->trace(''))->toBe([]);
        });

        it('stops and fills remaining when intermediate value is not an array', function () {
            $acc = ArrayAccessor::from(['user' => 'not-an-array']);
            $result = $acc->trace('user.address.city');

            expect($result)->toHaveCount(3);
            expect($result[0])->toEqual(new TraceSegment('user', true, 'string'));
            expect($result[1])->toEqual(new TraceSegment('address', false, null));
            expect($result[2])->toEqual(new TraceSegment('city', false, null));
        });
    });
});
