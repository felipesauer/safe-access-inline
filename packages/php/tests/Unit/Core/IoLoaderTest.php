<?php

use SafeAccessInline\Core\IoLoader;
use SafeAccessInline\Enums\AccessorFormat;
use SafeAccessInline\Exceptions\SecurityException;

$fixturesDir = realpath(__DIR__ . '/../../fixtures');

describe(IoLoader::class, function () use (&$fixturesDir) {

    // ── resolveFormatFromExtension ──────────────

    it('resolves known extensions', function () {
        expect(IoLoader::resolveFormatFromExtension('config.json'))->toBe(AccessorFormat::Json);
        expect(IoLoader::resolveFormatFromExtension('config.yaml'))->toBe(AccessorFormat::Yaml);
        expect(IoLoader::resolveFormatFromExtension('config.yml'))->toBe(AccessorFormat::Yaml);
        expect(IoLoader::resolveFormatFromExtension('config.toml'))->toBe(AccessorFormat::Toml);
        expect(IoLoader::resolveFormatFromExtension('config.ini'))->toBe(AccessorFormat::Ini);
        expect(IoLoader::resolveFormatFromExtension('config.cfg'))->toBe(AccessorFormat::Ini);
        expect(IoLoader::resolveFormatFromExtension('config.csv'))->toBe(AccessorFormat::Csv);
        expect(IoLoader::resolveFormatFromExtension('config.env'))->toBe(AccessorFormat::Env);
        expect(IoLoader::resolveFormatFromExtension('data.ndjson'))->toBe(AccessorFormat::Ndjson);
        expect(IoLoader::resolveFormatFromExtension('data.jsonl'))->toBe(AccessorFormat::Ndjson);
        expect(IoLoader::resolveFormatFromExtension('data.xml'))->toBe(AccessorFormat::Xml);
    });

    it('returns null for unknown extensions', function () {
        expect(IoLoader::resolveFormatFromExtension('file.unknown'))->toBeNull();
    });

    // ── assertPathWithinAllowedDirs ─────────────

    it('allows any path when no allowedDirs specified', function () {
        IoLoader::assertPathWithinAllowedDirs('/etc/passwd');
        expect(true)->toBeTrue();
    });

    it('allows paths within allowed directories', function () use (&$fixturesDir) {
        IoLoader::assertPathWithinAllowedDirs($fixturesDir . '/config.json', [$fixturesDir]);
        expect(true)->toBeTrue();
    });

    it('rejects paths outside allowed directories', function () use (&$fixturesDir) {
        IoLoader::assertPathWithinAllowedDirs('/etc/passwd', [$fixturesDir]);
    })->throws(SecurityException::class);

    it('rejects paths with null bytes', function () {
        IoLoader::assertPathWithinAllowedDirs("config\0.yaml");
    })->throws(SecurityException::class, 'null bytes');

    // ── readFile ────────────────────────────────

    it('reads a file successfully', function () use (&$fixturesDir) {
        $content = IoLoader::readFile($fixturesDir . '/config.json');
        expect($content)->toContain('test-app');
    });

    it('reads with allowed dirs check', function () use (&$fixturesDir) {
        $content = IoLoader::readFile($fixturesDir . '/config.json', [$fixturesDir]);
        expect($content)->toContain('test-app');
    });

    it('rejects reads outside allowed dirs', function () use (&$fixturesDir) {
        IoLoader::readFile('/etc/hostname', [$fixturesDir]);
    })->throws(SecurityException::class);

    // ── assertSafeUrl ───────────────────────────

    it('allows valid HTTPS URLs', function () {
        IoLoader::assertSafeUrl('https://example.com/path');
        expect(true)->toBeTrue();
    });

    it('rejects HTTP URLs', function () {
        IoLoader::assertSafeUrl('http://example.com');
    })->throws(SecurityException::class, 'Only HTTPS');

    it('rejects URLs with credentials', function () {
        IoLoader::assertSafeUrl('https://user:pass@example.com');
    })->throws(SecurityException::class, 'credentials');

    it('rejects non-allowed ports', function () {
        IoLoader::assertSafeUrl('https://example.com:8080');
    })->throws(SecurityException::class, 'Port 8080');

    it('allows specified ports', function () {
        IoLoader::assertSafeUrl('https://example.com:8080', ['allowedPorts' => [443, 8080]]);
        expect(true)->toBeTrue();
    });

    it('rejects hosts not in allowedHosts', function () {
        IoLoader::assertSafeUrl('https://evil.com', ['allowedHosts' => ['example.com']]);
    })->throws(SecurityException::class, 'not in the allowed list');

    it('blocks cloud metadata hostnames', function () {
        IoLoader::assertSafeUrl('https://metadata.google.internal');
    })->throws(SecurityException::class, 'cloud metadata');

    // ── isPrivateIp ─────────────────────────────

    it('detects private IPs', function () {
        expect(IoLoader::isPrivateIp('10.0.0.1'))->toBeTrue();
        expect(IoLoader::isPrivateIp('172.16.0.1'))->toBeTrue();
        expect(IoLoader::isPrivateIp('192.168.0.1'))->toBeTrue();
        expect(IoLoader::isPrivateIp('127.0.0.1'))->toBeTrue();
        expect(IoLoader::isPrivateIp('169.254.169.254'))->toBeTrue();
    });

    it('detects public IPs', function () {
        expect(IoLoader::isPrivateIp('8.8.8.8'))->toBeFalse();
        expect(IoLoader::isPrivateIp('1.1.1.1'))->toBeFalse();
    });

    it('treats invalid IPs as private', function () {
        expect(IoLoader::isPrivateIp('invalid'))->toBeTrue();
    });
});
