<?php

use SafeAccessInline\Exceptions\SecurityException;
use SafeAccessInline\SafeAccess;

$fixturesDir = realpath(__DIR__ . '/../fixtures');

describe('SafeAccess::fromFile', function () use (&$fixturesDir) {

    it('loads JSON file', function () use (&$fixturesDir) {
        $acc = SafeAccess::fromFile($fixturesDir . '/config.json');
        expect($acc->get('app.name'))->toBe('test-app');
        expect($acc->get('database.port'))->toBe(5432);
    });

    it('loads YAML file', function () use (&$fixturesDir) {
        $acc = SafeAccess::fromFile($fixturesDir . '/config.yaml');
        expect($acc->get('app.name'))->toBe('test-app');
    });

    it('loads TOML file', function () use (&$fixturesDir) {
        $acc = SafeAccess::fromFile($fixturesDir . '/config.toml');
        expect($acc->get('app.name'))->toBe('test-app');
    });

    it('loads ENV file', function () use (&$fixturesDir) {
        $acc = SafeAccess::fromFile($fixturesDir . '/config.env');
        expect($acc->get('APP_NAME'))->toBe('test-app');
    });

    it('respects format override', function () use (&$fixturesDir) {
        $acc = SafeAccess::fromFile($fixturesDir . '/config.json', 'json');
        expect($acc->get('app.name'))->toBe('test-app');
    });

    it('enforces allowedDirs', function () use (&$fixturesDir) {
        SafeAccess::fromFile('/etc/hostname', null, [$fixturesDir]);
    })->throws(SecurityException::class);
});

describe('SafeAccess::layer / layerFiles', function () use (&$fixturesDir) {

    it('merges multiple accessors (last wins)', function () {
        $base = SafeAccess::fromJson('{"app":{"name":"base","debug":false},"server":{"port":3000}}');
        $override = SafeAccess::fromJson('{"app":{"name":"override","version":"2.0"}}');
        $result = SafeAccess::layer([$base, $override]);
        expect($result->get('app.name'))->toBe('override');
        expect($result->get('app.debug'))->toBe(false);
        expect($result->get('app.version'))->toBe('2.0');
        expect($result->get('server.port'))->toBe(3000);
    });

    it('handles empty sources', function () {
        $result = SafeAccess::layer([]);
        expect($result->all())->toBe([]);
    });

    it('handles single source', function () {
        $source = SafeAccess::fromJson('{"a":1}');
        $result = SafeAccess::layer([$source]);
        expect($result->get('a'))->toBe(1);
    });

    it('layerFiles merges files in order', function () use (&$fixturesDir) {
        $result = SafeAccess::layerFiles([
            $fixturesDir . '/config.json',
            $fixturesDir . '/override.json',
        ]);
        expect($result->get('app.name'))->toBe('override-app');
        expect($result->get('app.debug'))->toBe(true);
        expect($result->get('app.version'))->toBe('2.0');
        expect($result->get('database.host'))->toBe('localhost');
        expect($result->get('cache.driver'))->toBe('redis');
    });

    it('layerFiles respects allowedDirs', function () use (&$fixturesDir) {
        SafeAccess::layerFiles(['/etc/hostname'], [$fixturesDir]);
    })->throws(SecurityException::class);
});
