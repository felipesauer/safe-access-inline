<?php

use SafeAccessInline\SafeAccess;
use SafeAccessInline\Core\PluginRegistry;
use SafeAccessInline\Plugins\DeviumTomlParser;

beforeEach(function () {
    PluginRegistry::reset();

    if (!class_exists(\Devium\Toml\Toml::class)) {
        test()->markTestSkipped('devium/toml not installed');
    }

    PluginRegistry::registerParser('toml', new DeviumTomlParser());
});

describe('TomlAccessor with real devium/toml', function () {

    it('parses real TOML with sections', function () {
        $toml = <<<TOML
        title = "My Config"
        debug = true

        [database]
        host = "localhost"
        port = 5432
        TOML;

        $accessor = SafeAccess::fromToml($toml);

        expect($accessor->get('title'))->toBe('My Config');
        expect($accessor->get('debug'))->toBe(true);
        expect($accessor->get('database.host'))->toBe('localhost');
        expect($accessor->get('database.port'))->toBe(5432);
    });

    it('parses TOML with nested tables', function () {
        $toml = <<<TOML
        [server]
        host = "0.0.0.0"
        port = 8080

        [server.ssl]
        enabled = true
        cert = "/path/to/cert"
        TOML;

        $accessor = SafeAccess::fromToml($toml);
        expect($accessor->get('server.host'))->toBe('0.0.0.0');
        expect($accessor->get('server.ssl.enabled'))->toBe(true);
        expect($accessor->get('server.ssl.cert'))->toBe('/path/to/cert');
    });
});
