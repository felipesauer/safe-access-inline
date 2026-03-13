<?php

use SafeAccessInline\SafeAccess;

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

    it('TOML → toToml roundtrip preserves data', function () {
        $toml = "title = \"Test\"\n\n[server]\nhost = \"localhost\"\nport = 8080";
        $accessor = SafeAccess::fromToml($toml);
        $output = $accessor->toToml();
        $accessor2 = SafeAccess::fromToml($output);
        expect($accessor2->get('title'))->toBe('Test');
        expect($accessor2->get('server.host'))->toBe('localhost');
        expect($accessor2->get('server.port'))->toBe(8080);
    });

    it('toToml returns valid TOML string', function () {
        $accessor = SafeAccess::fromArray(['name' => 'Ana', 'count' => 5]);
        $output = $accessor->toToml();
        expect($output)->toContain('name');
        expect($output)->toContain('Ana');
        expect($output)->toContain('count = 5');
    });
});
