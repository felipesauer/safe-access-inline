import { describe, it, expect, vi } from 'vitest';
import {
    ipToLong,
    isPrivateIp,
    isIpv6Loopback,
    assertSafeUrl,
    resolveAndValidateIp,
} from '../../../../src/security/sanitizers/ip-range-checker';
import { SecurityError } from '../../../../src/exceptions/security.error';

vi.mock('node:dns/promises', () => ({
    resolve4: vi.fn().mockResolvedValue([]),
    resolve6: vi.fn().mockResolvedValue([]),
}));

describe('ip-range-checker', () => {
    describe('ipToLong()', () => {
        it('converts valid IPv4', () => {
            expect(ipToLong('192.168.1.1')).toBe(0xc0a80101);
        });

        it('returns -1 for invalid IP', () => {
            expect(ipToLong('invalid')).toBe(-1);
        });

        it('returns -1 for out-of-range octets', () => {
            expect(ipToLong('256.0.0.1')).toBe(-1);
        });
    });

    describe('isPrivateIp()', () => {
        it.each([
            '10.0.0.1',
            '172.16.0.1',
            '192.168.0.1',
            '127.0.0.1',
            '169.254.169.254',
            '0.0.0.1',
        ])('detects %s as private', (ip) => {
            expect(isPrivateIp(ip)).toBe(true);
        });

        it.each(['8.8.8.8', '1.1.1.1', '203.0.113.1'])('detects %s as public', (ip) => {
            expect(isPrivateIp(ip)).toBe(false);
        });

        it('treats invalid IPs as private (safety)', () => {
            expect(isPrivateIp('invalid')).toBe(true);
        });

        // ── Security regression: RFC 6598 CGNAT range (100.64.0.0/10) ────
        it.each(['100.64.0.0', '100.64.0.1', '100.100.100.100', '100.127.255.255'])(
            'detects CGNAT address %s as private (RFC 6598)',
            (ip) => {
                expect(isPrivateIp(ip)).toBe(true);
            },
        );

        it('treats first address after CGNAT range (100.128.0.0) as public', () => {
            expect(isPrivateIp('100.128.0.0')).toBe(false);
        });

        it('treats last address before CGNAT range (100.63.255.255) as public', () => {
            expect(isPrivateIp('100.63.255.255')).toBe(false);
        });
    });

    describe('isIpv6Loopback()', () => {
        it('detects ::1', () => {
            expect(isIpv6Loopback('::1')).toBe(true);
        });

        it('detects [::1]', () => {
            expect(isIpv6Loopback('[::1]')).toBe(true);
        });

        it('detects expanded form', () => {
            expect(isIpv6Loopback('0:0:0:0:0:0:0:1')).toBe(true);
        });

        it('detects ULA range fc00::/7 (fc prefix)', () => {
            expect(isIpv6Loopback('fc00:db8::1')).toBe(true);
        });

        it('detects ULA range fc00::/7 (fd prefix)', () => {
            expect(isIpv6Loopback('fd12:3456:789a::1')).toBe(true);
        });

        it('detects link-local fe80::/10 range', () => {
            expect(isIpv6Loopback('fe80::1')).toBe(true);
        });

        it('rejects non-loopback', () => {
            expect(isIpv6Loopback('::2')).toBe(false);
        });
    });

    describe('assertSafeUrl()', () => {
        it('allows valid HTTPS URLs', () => {
            expect(() => assertSafeUrl('https://example.com/path')).not.toThrow();
        });

        it('rejects HTTP URLs', () => {
            expect(() => assertSafeUrl('http://example.com')).toThrow(SecurityError);
            expect(() => assertSafeUrl('http://example.com')).toThrow('Only HTTPS');
        });

        it('rejects invalid URLs', () => {
            expect(() => assertSafeUrl('not-a-url')).toThrow(SecurityError);
        });

        it('rejects URLs with credentials', () => {
            expect(() => assertSafeUrl('https://user:pass@example.com')).toThrow(
                'embedded credentials',
            );
        });

        it('rejects non-allowed ports', () => {
            expect(() => assertSafeUrl('https://example.com:8080')).toThrow('Port 8080');
        });

        it('allows specified ports', () => {
            expect(() =>
                assertSafeUrl('https://example.com:8080', { allowedPorts: [443, 8080] }),
            ).not.toThrow();
        });

        it('rejects hosts not in allowedHosts', () => {
            expect(() =>
                assertSafeUrl('https://evil.com', { allowedHosts: ['example.com'] }),
            ).toThrow('not in the allowed list');
        });

        it('rejects private IPs', () => {
            expect(() => assertSafeUrl('https://127.0.0.1')).toThrow('SSRF protection');
            expect(() => assertSafeUrl('https://10.0.0.1')).toThrow('SSRF protection');
            expect(() => assertSafeUrl('https://192.168.1.1')).toThrow('SSRF protection');
            expect(() => assertSafeUrl('https://169.254.169.254')).toThrow('SSRF protection');
        });

        it('allows private IPs when explicitly permitted', () => {
            expect(() =>
                assertSafeUrl('https://127.0.0.1', { allowPrivateIps: true }),
            ).not.toThrow();
        });

        it('rejects IPv6 loopback', () => {
            expect(() => assertSafeUrl('https://[::1]')).toThrow('loopback IPv6');
        });

        it('blocks cloud metadata hostnames', () => {
            expect(() => assertSafeUrl('https://metadata.google.internal')).toThrow(
                'cloud metadata',
            );
            expect(() => assertSafeUrl('https://instance-data')).toThrow('cloud metadata');
        });

        it('blocks ::ffff: IPv4-mapped IPv6 with private IP', () => {
            expect(() => assertSafeUrl('https://[::ffff:127.0.0.1]')).toThrow('SSRF protection');
            expect(() => assertSafeUrl('https://[::ffff:10.0.0.1]')).toThrow('SSRF protection');
            expect(() => assertSafeUrl('https://[::ffff:192.168.1.1]')).toThrow('SSRF protection');
        });

        it('allows ::ffff: IPv4-mapped IPv6 with public IP', () => {
            expect(() => assertSafeUrl('https://[::ffff:8.8.8.8]')).not.toThrow();
        });

        it('blocks ::ffff: IPv4-mapped IPv6 in hex pair format with private IP', () => {
            // ::ffff:7f00:1 is hex for 127.0.0.1
            expect(() => assertSafeUrl('https://[::ffff:7f00:1]')).toThrow('SSRF protection');
        });

        it('allows ::ffff: IPv4-mapped IPv6 in hex pair format with public IP', () => {
            // ::ffff:808:808 is hex for 8.8.8.8
            expect(() => assertSafeUrl('https://[::ffff:808:808]')).not.toThrow();
        });

        it('allows host when it is in allowedHosts list', () => {
            expect(() =>
                assertSafeUrl('https://example.com', { allowedHosts: ['example.com'] }),
            ).not.toThrow();
        });

        it('allows raw public IPv4 address (isPrivateIp returns false)', () => {
            expect(() => assertSafeUrl('https://8.8.8.8')).not.toThrow();
        });
    });

    describe('resolveAndValidateIp()', () => {
        it('throws SecurityError when AAAA record resolves to IPv6 loopback', async () => {
            const dns = await import('node:dns/promises');
            vi.mocked(dns.resolve4).mockResolvedValueOnce([]);
            vi.mocked(dns.resolve6).mockResolvedValueOnce(['::1']);
            await expect(resolveAndValidateIp('evil-v6only.example.com')).rejects.toThrow(
                SecurityError,
            );
        });

        it('returns the first validated IPv6 address when only AAAA records exist', async () => {
            const dns = await import('node:dns/promises');
            vi.mocked(dns.resolve4).mockResolvedValueOnce([]);
            vi.mocked(dns.resolve6).mockResolvedValueOnce(['2001:db8::1']);
            await expect(resolveAndValidateIp('v6only.example.com')).resolves.toBe('2001:db8::1');
        });
    });
});

// ── IpRangeChecker — edge branches ────────────────────────────
describe('IpRangeChecker — edge branches', () => {
    it('handles edge case IP ranges', () => {
        expect(isPrivateIp('10.0.0.1')).toBe(true);
        expect(isPrivateIp('172.16.0.1')).toBe(true);
        expect(isPrivateIp('172.31.255.255')).toBe(true);
        expect(isPrivateIp('172.32.0.1')).toBe(false);
        expect(isPrivateIp('192.168.0.1')).toBe(true);
        expect(isPrivateIp('8.8.8.8')).toBe(false);
        expect(isPrivateIp('127.0.0.1')).toBe(true);
        expect(isPrivateIp('169.254.0.1')).toBe(true);
    });
});

// ── IpRangeChecker — positive allowedHosts and public IP ────────
describe('IpRangeChecker — positive paths', () => {
    it('allows URL when host IS in allowedHosts', () => {
        expect(() =>
            assertSafeUrl('https://example.com', { allowedHosts: ['example.com'] }),
        ).not.toThrow();
    });

    it('allows public IP addresses (non-private)', () => {
        expect(() => assertSafeUrl('https://8.8.8.8')).not.toThrow();
    });
});
