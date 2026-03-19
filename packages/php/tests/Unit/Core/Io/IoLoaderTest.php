<?php

use SafeAccessInline\Contracts\HttpClientInterface;
use SafeAccessInline\Core\Io\IoLoader;
use SafeAccessInline\Enums\AccessorFormat;
use SafeAccessInline\Exceptions\SecurityException;

$fixturesDir = realpath(__DIR__ . '/../../../fixtures');

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

    it('throws when no allowedDirs and no allowAnyPath', function () {
        IoLoader::assertPathWithinAllowedDirs('/etc/passwd');
    })->throws(SecurityException::class, 'No allowedDirs configured');

    it('allows any path with allowAnyPath true', function () {
        IoLoader::assertPathWithinAllowedDirs('/etc/passwd', [], true);
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
        $content = IoLoader::readFile($fixturesDir . '/config.json', [$fixturesDir]);
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

    // ── IPv6 link-local and mapped blocking ─────

    it('blocks IPv6 link-local addresses', function () {
        IoLoader::assertSafeUrl('https://[fe80::1]');
    })->throws(SecurityException::class, 'link-local');

    it('blocks IPv4-mapped IPv6 with private IP', function () {
        IoLoader::assertSafeUrl('https://[::ffff:127.0.0.1]');
    })->throws(SecurityException::class, 'private/internal');

    it('blocks IPv6 loopback ::1', function () {
        IoLoader::assertSafeUrl('https://[::1]');
    })->throws(SecurityException::class, 'loopback');

    it('blocks IPv6 loopback long form', function () {
        IoLoader::assertSafeUrl('https://[0:0:0:0:0:0:0:1]');
    })->throws(SecurityException::class, 'loopback');

    it('blocks IPv6 ULA fc00::/7 (fc prefix)', function () {
        IoLoader::assertSafeUrl('https://[fc00:db8::1]');
    })->throws(SecurityException::class, 'unique local');

    it('blocks IPv6 ULA fc00::/7 (fd prefix)', function () {
        IoLoader::assertSafeUrl('https://[fd12:3456:789a::1]');
    })->throws(SecurityException::class, 'unique local');

    // ── isPrivateIpv6 ───────────────────────────

    it('detects private IPv6 loopback', function () {
        expect(IoLoader::isPrivateIpv6('::1'))->toBeTrue();
        expect(IoLoader::isPrivateIpv6('0:0:0:0:0:0:0:1'))->toBeTrue();
    });

    it('detects private IPv6 link-local', function () {
        expect(IoLoader::isPrivateIpv6('fe80::1'))->toBeTrue();
    });

    it('detects private IPv6 ULA', function () {
        expect(IoLoader::isPrivateIpv6('fc00::1'))->toBeTrue();
        expect(IoLoader::isPrivateIpv6('fd12:3456::1'))->toBeTrue();
    });

    it('detects private IPv4-mapped IPv6', function () {
        expect(IoLoader::isPrivateIpv6('::ffff:127.0.0.1'))->toBeTrue();
        expect(IoLoader::isPrivateIpv6('::ffff:10.0.0.1'))->toBeTrue();
    });

    it('treats public IPv6 as non-private', function () {
        expect(IoLoader::isPrivateIpv6('2001:db8::1'))->toBeFalse();
        expect(IoLoader::isPrivateIpv6('2607:f8b0:4004:800::200e'))->toBeFalse();
    });

    // ── assertSafeUrl returns resolved IP ───────

    it('returns the resolved IP address', function () {
        $ip = IoLoader::assertSafeUrl('https://example.com');
        expect($ip)->toBeString();
        expect(filter_var($ip, FILTER_VALIDATE_IP))->not->toBeFalse();
    });

    // ── fetchUrl ────────────────────────────────

    it('rejects fetchUrl with private IP host', function () {
        IoLoader::fetchUrl('https://127.0.0.1/secret');
    })->throws(SecurityException::class, 'private/internal');

    it('rejects fetchUrl with HTTP scheme', function () {
        IoLoader::fetchUrl('http://example.com');
    })->throws(SecurityException::class, 'Only HTTPS');

    it('rejects fetchUrl with IPv6 loopback', function () {
        IoLoader::fetchUrl('https://[::1]/path');
    })->throws(SecurityException::class, 'loopback');

    it('rejects fetchUrl with link-local IPv6', function () {
        IoLoader::fetchUrl('https://[fe80::1]/path');
    })->throws(SecurityException::class, 'link-local');

    it('rejects fetchUrl with metadata hostname', function () {
        IoLoader::fetchUrl('https://metadata.google.internal/computeMetadata/v1/');
    })->throws(SecurityException::class, 'cloud metadata');

    it('fetchUrl exercises cURL path for unreachable host', function () {
        // Uses a non-routable IP to trigger a cURL connection error,
        // exercising the full cURL code path including CURLOPT_RESOLVE.
        IoLoader::fetchUrl('https://unreachable-test.invalid', ['allowPrivateIps' => true]);
    })->throws(SecurityException::class, 'Failed to fetch URL');

    // ── COV-001: assertPathWithinAllowedDirs — both file and parent dir missing

    it('rejects path where both file and parent directory do not exist', function () use (&$fixturesDir) {
        // Neither the file nor the directory can be resolved by realpath
        IoLoader::assertPathWithinAllowedDirs('/nonexistent_dir_abc/deep/file.json', [$fixturesDir]);
    })->throws(SecurityException::class, 'outside allowed directories');

    // ── COV-002 + COV-004: fetchUrl with MockHttpClient ─────────

    it('fetchUrl returns content via mock HTTP client', function () {
        $mock = new class () implements HttpClientInterface {
            public function fetch(string $url, array $curlOptions): string
            {
                return '{"mocked": true}';
            }
        };
        IoLoader::setHttpClient($mock);

        $content = IoLoader::fetchUrl('https://example.com/data.json');
        expect($content)->toBe('{"mocked": true}');

        IoLoader::resetHttpClient();
    });

    it('fetchUrl propagates SecurityException from HTTP client (COV-004)', function () {
        $mock = new class () implements HttpClientInterface {
            public function fetch(string $url, array $curlOptions): string
            {
                throw new SecurityException("Failed to initialize cURL for URL: '{$url}'");
            }
        };
        IoLoader::setHttpClient($mock);

        try {
            IoLoader::fetchUrl('https://example.com/data.json');
        } finally {
            IoLoader::resetHttpClient();
        }
    })->throws(SecurityException::class, 'Failed to initialize cURL');

    it('resetHttpClient restores default client', function () {
        $mock = new class () implements HttpClientInterface {
            public function fetch(string $url, array $curlOptions): string
            {
                return 'mock';
            }
        };
        IoLoader::setHttpClient($mock);
        IoLoader::resetHttpClient();

        // After reset, the default CurlHttpClient is used, which will fail for unreachable hosts
        expect(fn () => IoLoader::fetchUrl('https://unreachable-test.invalid', ['allowPrivateIps' => true]))
            ->toThrow(SecurityException::class, 'Failed to fetch URL');
    });

    // ── Path resolution edge cases ─────────────

    it('assertPathWithinAllowedDirs resolves non-existent file within allowed dir', function () {
        $tmpDir = sys_get_temp_dir();
        // File doesn't exist, but directory does — should resolve through dirname
        $nonExistent = $tmpDir . '/safe_access_nonexistent_' . uniqid() . '.json';
        // Should NOT throw when allowedDirs contains the temp dir
        IoLoader::assertPathWithinAllowedDirs($nonExistent, [$tmpDir]);
        expect(true)->toBeTrue(); // no exception
    });

    it('assertPathWithinAllowedDirs throws for completely invalid directory', function () {
        $fakePath = '/nonexistent_dir_' . uniqid() . '/subdir/file.json';
        expect(fn () => IoLoader::assertPathWithinAllowedDirs($fakePath, ['/tmp']))
            ->toThrow(SecurityException::class, 'outside allowed directories');
    });

    it('readFile throws for failed file read', function () {
        $tmpDir = sys_get_temp_dir();
        $path = $tmpDir . '/safe_access_missing_' . uniqid() . '.json';
        expect(fn () => IoLoader::readFile($path, [$tmpDir]))
            ->toThrow(SecurityException::class, 'Failed to read file');
    });

    // ── assertSafeUrl: invalid URL ───────────────

    it('assertSafeUrl rejects completely invalid URL', function () {
        expect(fn () => IoLoader::assertSafeUrl('not a url at all ://'))
            ->toThrow(SecurityException::class, 'Invalid URL');
    });
});
