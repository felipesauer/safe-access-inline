<?php

declare(strict_types=1);

use SafeAccessInline\Core\Parsers\DotNotationParser;
use SafeAccessInline\Core\Parsers\SegmentParser;
use SafeAccessInline\Enums\SegmentType;

describe('Projection', function (): void {

    // ── SegmentParser ────────────────────────────────────────────────────────

    describe(SegmentParser::class, function (): void {
        it('parses {name, age} as PROJECTION segment with two same-name fields', function (): void {
            $segments = SegmentParser::parseSegments('users[*].{name, age}');

            expect($segments)->toHaveCount(3);
            expect($segments[2])->toBe([
                'type'   => SegmentType::PROJECTION,
                'fields' => [
                    ['alias' => 'name', 'source' => 'name'],
                    ['alias' => 'age',  'source' => 'age'],
                ],
            ]);
        });

        it('parses {fullName: name, yr: age} as PROJECTION with aliased fields', function (): void {
            $segments = SegmentParser::parseSegments('users[*].{fullName: name, yr: age}');

            expect($segments)->toHaveCount(3);
            expect($segments[2])->toBe([
                'type'   => SegmentType::PROJECTION,
                'fields' => [
                    ['alias' => 'fullName', 'source' => 'name'],
                    ['alias' => 'yr',       'source' => 'age'],
                ],
            ]);
        });

        it('parses single-field projection {id}', function (): void {
            $segments = SegmentParser::parseSegments('items.{id}');

            expect($segments)->toHaveCount(2);
            expect($segments[1])->toBe([
                'type'   => SegmentType::PROJECTION,
                'fields' => [['alias' => 'id', 'source' => 'id']],
            ]);
        });
    });

    // ── PathResolver (via DotNotationParser) ─────────────────────────────────

    describe('PathResolver', function (): void {
        $data = [
            'users' => [
                ['name' => 'Ana', 'age' => 30, 'email' => 'ana@example.com', 'role' => 'admin'],
                ['name' => 'Bob', 'age' => 25, 'email' => 'bob@example.com', 'role' => 'user'],
                ['name' => 'Lia', 'age' => 35, 'email' => 'lia@example.com', 'role' => 'admin'],
            ],
        ];

        it('projects named fields from wildcard', function () use ($data): void {
            $result = DotNotationParser::get($data, 'users[*].{name, age}');

            expect($result)->toBe([
                ['name' => 'Ana', 'age' => 30],
                ['name' => 'Bob', 'age' => 25],
                ['name' => 'Lia', 'age' => 35],
            ]);
        });

        it('supports field renaming via alias:field', function () use ($data): void {
            $result = DotNotationParser::get($data, 'users[*].{fullName: name, yr: age}');

            expect($result)->toBe([
                ['fullName' => 'Ana', 'yr' => 30],
                ['fullName' => 'Bob', 'yr' => 25],
                ['fullName' => 'Lia', 'yr' => 35],
            ]);
        });

        it('returns null for missing fields in projection', function () use ($data): void {
            $result = DotNotationParser::get($data, 'users[*].{name, nonExistent}');

            expect($result)->toBe([
                ['name' => 'Ana', 'nonExistent' => null],
                ['name' => 'Bob', 'nonExistent' => null],
                ['name' => 'Lia', 'nonExistent' => null],
            ]);
        });

        it('projects from filter result (filter + projection)', function () use ($data): void {
            $result = DotNotationParser::get($data, 'users[?role==admin].{name, email}');

            expect($result)->toBe([
                ['name' => 'Ana', 'email' => 'ana@example.com'],
                ['name' => 'Lia', 'email' => 'lia@example.com'],
            ]);
        });

        it('projects single object (no wildcard)', function (): void {
            $singleData = ['user' => ['name' => 'Ana', 'age' => 30, 'email' => 'ana@example.com']];
            $result     = DotNotationParser::get($singleData, 'user.{name, age}');

            expect($result)->toBe(['name' => 'Ana', 'age' => 30]);
        });

        it('projects with mixed alias and non-alias fields', function () use ($data): void {
            $result = DotNotationParser::get($data, 'users[*].{id: name, age}');

            expect($result)->toBe([
                ['id' => 'Ana', 'age' => 30],
                ['id' => 'Bob', 'age' => 25],
                ['id' => 'Lia', 'age' => 35],
            ]);
        });

        it('returns defaultValue when applied to non-array scalar', function (): void {
            $result = DotNotationParser::get(['count' => 42], 'count.{id}', 'fallback');

            expect($result)->toBe('fallback');
        });
    });
});
