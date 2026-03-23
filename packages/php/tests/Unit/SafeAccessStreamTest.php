<?php

declare(strict_types=1);

use SafeAccessInline\Exceptions\SecurityException;
use SafeAccessInline\SafeAccess;

$fixturesDir = realpath(__DIR__ . '/../fixtures');

afterEach(function (): void {
    SafeAccess::resetAll();
});

describe(SafeAccess::class, function () use (&$fixturesDir): void {

    // ── streamCsv ──

    describe('streamCsv', function () use (&$fixturesDir): void {

        it('yields one ObjectAccessor per CSV data row', function () use (&$fixturesDir): void {
            $rows = [];
            foreach (SafeAccess::streamCsv($fixturesDir . '/data.csv', allowAnyPath: true) as $row) {
                $rows[] = $row;
            }
            expect($rows)->toHaveCount(3);
        });

        it('each accessor has header-keyed properties', function () use (&$fixturesDir): void {
            $rows = [];
            foreach (SafeAccess::streamCsv($fixturesDir . '/data.csv', allowAnyPath: true) as $row) {
                $rows[] = $row;
            }
            expect($rows[0]->get('name'))->toBe('Ana');
            expect($rows[0]->get('age'))->toBe('25');
            expect($rows[0]->get('email'))->toBe('ana@example.com');
        });

        it('all rows have correct name values', function () use (&$fixturesDir): void {
            $names = [];
            foreach (SafeAccess::streamCsv($fixturesDir . '/data.csv', allowAnyPath: true) as $row) {
                $names[] = $row->get('name');
            }
            expect($names)->toBe(['Ana', 'Bob', 'Carlos']);
        });

        it('yields within allowedDirs restriction', function () use (&$fixturesDir): void {
            $rows = [];
            foreach (SafeAccess::streamCsv($fixturesDir . '/data.csv', allowedDirs: [$fixturesDir]) as $row) {
                $rows[] = $row;
            }
            expect($rows)->toHaveCount(3);
        });

        it('throws SecurityException without allowedDirs or allowAnyPath', function () use (&$fixturesDir): void {
            $gen = SafeAccess::streamCsv($fixturesDir . '/data.csv');
            $gen->current();
        })->throws(SecurityException::class);

    });

    // ── streamNdjson ──

    describe('streamNdjson', function () use (&$fixturesDir): void {

        it('yields one JsonAccessor per NDJSON line', function () use (&$fixturesDir): void {
            $items = [];
            foreach (SafeAccess::streamNdjson($fixturesDir . '/data.ndjson', allowAnyPath: true) as $item) {
                $items[] = $item;
            }
            expect($items)->toHaveCount(3);
        });

        it('each accessor resolves JSON keys directly', function () use (&$fixturesDir): void {
            $items = [];
            foreach (SafeAccess::streamNdjson($fixturesDir . '/data.ndjson', allowAnyPath: true) as $item) {
                $items[] = $item;
            }
            expect($items[0]->get('name'))->toBe('Ana');
            expect($items[0]->get('age'))->toBe(25);
        });

        it('all lines are parsed', function () use (&$fixturesDir): void {
            $names = [];
            foreach (SafeAccess::streamNdjson($fixturesDir . '/data.ndjson', allowAnyPath: true) as $item) {
                $names[] = $item->get('name');
            }
            expect($names)->toBe(['Ana', 'Bob', 'Carlos']);
        });

        it('throws SecurityException without allowedDirs or allowAnyPath', function () use (&$fixturesDir): void {
            $gen = SafeAccess::streamNdjson($fixturesDir . '/data.ndjson');
            $gen->current();
        })->throws(SecurityException::class);

    });

});
