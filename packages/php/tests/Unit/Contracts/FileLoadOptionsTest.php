<?php

declare(strict_types=1);

use SafeAccessInline\Contracts\FileLoadOptions;
use SafeAccessInline\Exceptions\SecurityException;
use SafeAccessInline\SafeAccess;

$fixturesDir = realpath(__DIR__ . '/../../fixtures');

describe(FileLoadOptions::class, function () use (&$fixturesDir): void {

    describe('maxSize', function () use (&$fixturesDir): void {

        it('loads a file when content is under the maxSize limit', function () use (&$fixturesDir): void {
            $options = new FileLoadOptions(allowAnyPath: true, maxSize: 1_000_000);
            $accessor = SafeAccess::fromFile($fixturesDir . '/config.json', $options);
            expect($accessor->get('app.name'))->not->toBeNull();
            $options = new FileLoadOptions(allowAnyPath: true, maxSize: 1); // 1 byte limit
            expect(fn () => SafeAccess::fromFile($fixturesDir . '/config.json', $options))
                ->toThrow(SecurityException::class);
        });

        it('applies no size restriction when maxSize is null', function () use (&$fixturesDir): void {
            $options = new FileLoadOptions(allowAnyPath: true, maxSize: null);
            $accessor = SafeAccess::fromFile($fixturesDir . '/config.json', $options);
            expect($accessor)->not->toBeNull();
        });

    });

    describe('allowedExtensions', function () use (&$fixturesDir): void {

        it('loads a file when its extension is in the allowedExtensions list', function () use (&$fixturesDir): void {
            $options = new FileLoadOptions(allowAnyPath: true, allowedExtensions: ['json']);
            $accessor = SafeAccess::fromFile($fixturesDir . '/config.json', $options);
            expect($accessor->get('app.name'))->not->toBeNull();
        });

        it('throws SecurityException when extension is not in allowedExtensions', function () use (&$fixturesDir): void {
            $options = new FileLoadOptions(allowAnyPath: true, allowedExtensions: ['yaml', 'toml']);
            expect(fn () => SafeAccess::fromFile($fixturesDir . '/config.json', $options))
                ->toThrow(SecurityException::class);
        });

        it('applies no extension restriction when allowedExtensions is empty', function () use (&$fixturesDir): void {
            $options = new FileLoadOptions(allowAnyPath: true, allowedExtensions: []);
            $accessor = SafeAccess::fromFile($fixturesDir . '/config.json', $options);
            expect($accessor)->not->toBeNull();
        });

        it('normalises extension comparison (leading dot / case-insensitive)', function () use (&$fixturesDir): void {
            // Pass the extension with a leading dot — should match .json
            $options = new FileLoadOptions(allowAnyPath: true, allowedExtensions: ['.JSON']);
            $accessor = SafeAccess::fromFile($fixturesDir . '/config.json', $options);
            expect($accessor)->not->toBeNull();
        });

    });

    describe('maxSize + allowedExtensions combined', function () use (&$fixturesDir): void {

        it('passes both checks when constraints are satisfied', function () use (&$fixturesDir): void {
            $options = new FileLoadOptions(allowAnyPath: true, maxSize: 1_000_000, allowedExtensions: ['json']);
            $accessor = SafeAccess::fromFile($fixturesDir . '/config.json', $options);
            expect($accessor)->not->toBeNull();
        });

        it('fails on extension before checking size', function () use (&$fixturesDir): void {
            // maxSize would be fine but extension is blocked → SecurityException
            $options = new FileLoadOptions(allowAnyPath: true, maxSize: 1_000_000, allowedExtensions: ['yaml']);
            expect(fn () => SafeAccess::fromFile($fixturesDir . '/config.json', $options))
                ->toThrow(SecurityException::class);
        });

    });

});
