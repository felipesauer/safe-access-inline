<?php

declare(strict_types=1);

use SafeAccessInline\Security\Guards\IpRangeChecker;

describe(IpRangeChecker::class, function (): void {

    // ── isPrivateIpv4 ────────────────────────────────────────────────────────

    describe('isPrivateIpv4', function (): void {
        it('returns true for RFC 1918 addresses', function (): void {
            expect(IpRangeChecker::isPrivateIpv4('10.0.0.1'))->toBeTrue();
            expect(IpRangeChecker::isPrivateIpv4('172.16.0.1'))->toBeTrue();
            expect(IpRangeChecker::isPrivateIpv4('192.168.0.1'))->toBeTrue();
        });

        it('returns true for loopback addresses', function (): void {
            expect(IpRangeChecker::isPrivateIpv4('127.0.0.1'))->toBeTrue();
            expect(IpRangeChecker::isPrivateIpv4('127.255.255.255'))->toBeTrue();
        });

        it('returns true for link-local addresses (AWS metadata)', function (): void {
            expect(IpRangeChecker::isPrivateIpv4('169.254.169.254'))->toBeTrue();
        });

        it('returns true for CGNAT addresses (RFC 6598)', function (): void {
            expect(IpRangeChecker::isPrivateIpv4('100.64.0.1'))->toBeTrue();
            expect(IpRangeChecker::isPrivateIpv4('100.127.255.255'))->toBeTrue();
        });

        it('returns false for public addresses', function (): void {
            expect(IpRangeChecker::isPrivateIpv4('8.8.8.8'))->toBeFalse();
            expect(IpRangeChecker::isPrivateIpv4('1.1.1.1'))->toBeFalse();
            expect(IpRangeChecker::isPrivateIpv4('100.128.0.0'))->toBeFalse();
        });

        it('returns true for invalid inputs (fail-safe)', function (): void {
            expect(IpRangeChecker::isPrivateIpv4('invalid'))->toBeTrue();
            expect(IpRangeChecker::isPrivateIpv4(''))->toBeTrue();
        });
    });

    // ── isPrivateIpv6 ────────────────────────────────────────────────────────

    describe('isPrivateIpv6', function (): void {
        it('returns true for loopback addresses', function (): void {
            expect(IpRangeChecker::isPrivateIpv6('::1'))->toBeTrue();
            expect(IpRangeChecker::isPrivateIpv6('0:0:0:0:0:0:0:1'))->toBeTrue();
        });

        it('returns true for link-local addresses (fe80::/10)', function (): void {
            expect(IpRangeChecker::isPrivateIpv6('fe80::1'))->toBeTrue();
            expect(IpRangeChecker::isPrivateIpv6('fe90::1'))->toBeTrue();
            expect(IpRangeChecker::isPrivateIpv6('feA0::1'))->toBeTrue();
        });

        it('returns true for ULA addresses (fc00::/7)', function (): void {
            expect(IpRangeChecker::isPrivateIpv6('fc00::1'))->toBeTrue();
            expect(IpRangeChecker::isPrivateIpv6('fd12:3456::1'))->toBeTrue();
        });

        it('returns true for IPv4-mapped private addresses', function (): void {
            expect(IpRangeChecker::isPrivateIpv6('::ffff:127.0.0.1'))->toBeTrue();
            expect(IpRangeChecker::isPrivateIpv6('::ffff:10.0.0.1'))->toBeTrue();
        });

        it('returns false for public addresses', function (): void {
            expect(IpRangeChecker::isPrivateIpv6('2001:db8::1'))->toBeFalse();
            expect(IpRangeChecker::isPrivateIpv6('2606:4700::1'))->toBeFalse();
        });
    });
});
