<?php

use SafeAccessInline\Core\Io\NativeDnsResolver;

describe(NativeDnsResolver::class, function () {

    // ── resolveIPv6 — AAAA record returns ipv6 address (line 45) ─────────

    it('resolveIPv6 — returns IPv6 address when dnsGetRecord returns an AAAA record (line 45)', function () {
        // Override dnsGetRecord() to return a fixture AAAA record, avoiding
        // any real network call while exercising the `return $records[0]['ipv6']`
        // branch (line 45 of NativeDnsResolver).
        $resolver = new class () extends NativeDnsResolver {
            protected function dnsGetRecord(string $host): array|false
            {
                return [['ipv6' => '::1']];
            }
        };

        expect($resolver->resolveIPv6('localhost'))->toBe('::1');
    });

    it('resolveIPv6 — returns null when dnsGetRecord returns an empty array', function () {
        $resolver = new class () extends NativeDnsResolver {
            protected function dnsGetRecord(string $host): array|false
            {
                return [];
            }
        };

        expect($resolver->resolveIPv6('no-aaaa.example'))->toBeNull();
    });

    it('resolveIPv6 — returns null when dnsGetRecord returns false', function () {
        $resolver = new class () extends NativeDnsResolver {
            protected function dnsGetRecord(string $host): array|false
            {
                return false;
            }
        };

        expect($resolver->resolveIPv6('error.example'))->toBeNull();
    });

    // ── resolveIPv4 — delegates to gethostbyname ─────────────────────────

    it('resolveIPv4 — returns the host unchanged when resolution fails', function () {
        // gethostbyname() returns the host unchanged when it cannot be resolved.
        $resolver = new NativeDnsResolver();
        $result = $resolver->resolveIPv4('this.host.does.not.exist.invalid');
        expect($result)->toBe('this.host.does.not.exist.invalid');
    });
});
