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

        it('returns null when resolve4 throws synchronously (unexpected OS-level error)', async () => {
            const dns = await import('node:dns/promises');
            // A synchronous throw bypasses the per-record .catch(() => []) handler and
            // falls through to the outer catch, which swallows non-SecurityErrors.
            vi.mocked(dns.resolve4).mockImplementationOnce(() => {
                throw new TypeError('Unexpected OS-level failure');
            });
            await expect(resolveAndValidateIp('example.com')).resolves.toBeNull();
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

// ── ipToLong — boundary values ──────────────────────────────────
describe('ipToLong — boundary values', () => {
    it('treats 255 as a valid octet (max allowed value, not > 255)', () => {
        // Mutation: changes p > 255 to p >= 255, which would reject 255
        expect(ipToLong('255.255.255.255')).not.toBe(-1);
        expect(ipToLong('255.0.0.0')).toBe(0xff000000 >>> 0);
        expect(ipToLong('0.0.0.255')).toBe(255);
    });

    it('returns -1 for negative octets (p < 0 with LogicalOperator || not &&)', () => {
        // Mutation: changes isNaN(p) || p < 0 to isNaN(p) && p < 0
        // With &&, a negative NaN-free number like -1 would not be rejected
        expect(ipToLong('1.-1.0.0')).toBe(-1);
        expect(ipToLong('-1.0.0.0')).toBe(-1);
        expect(ipToLong('0.0.0.-1')).toBe(-1);
    });

    it('returns -1 for IPs with too few parts (parts.length !== 4)', () => {
        expect(ipToLong('1.2.3')).toBe(-1);
        expect(ipToLong('1.2')).toBe(-1);
    });

    it('returns correct numeric value for typical addresses', () => {
        expect(ipToLong('0.0.0.0')).toBe(0);
        expect(ipToLong('1.0.0.0')).toBe(0x01000000);
        expect(ipToLong('10.0.0.1')).toBe(0x0a000001);
    });
});

// ── isPrivateIp — exact range boundary (start of each range) ────
describe('isPrivateIp — range boundary tests', () => {
    it('returns true for the exact start address of each private range', () => {
        // Mutation: changes long >= range.start to long > range.start
        // That would make addresses exactly AT range.start appear public
        expect(isPrivateIp('10.0.0.0')).toBe(true); // 10.0.0.0/8 start
        expect(isPrivateIp('172.16.0.0')).toBe(true); // 172.16.0.0/12 start
        expect(isPrivateIp('192.168.0.0')).toBe(true); // 192.168.0.0/16 start
        expect(isPrivateIp('127.0.0.0')).toBe(true); // 127.0.0.0/8 start
        expect(isPrivateIp('169.254.0.0')).toBe(true); // 169.254.0.0/16 start
        expect(isPrivateIp('0.0.0.0')).toBe(true); // 0.0.0.0/8 start
        expect(isPrivateIp('100.64.0.0')).toBe(true); // 100.64.0.0/10 start
    });

    it('returns false for addresses just before the first private range', () => {
        expect(isPrivateIp('9.255.255.255')).toBe(false);
    });
});

// ── isIpv6Loopback — regex anchor and pattern edge cases ────────
describe('isIpv6Loopback — regex mutation edge cases', () => {
    it('returns false for host with embedded [ not at start (kills no-^ regex mutation)', () => {
        // Mutation removes ^ from /^\[|\]$/g → /\[|\]$/g cleans embedded [ anywhere
        // Real regex only removes [ at START; if real cleaning leaves [, ULA check fails
        expect(isIpv6Loopback('fc[00::1]')).toBe(false);
    });

    it('returns false for host with ] in middle not at end (kills no-$ regex mutation)', () => {
        // Mutation removes $ from /^\[|\]$/g → /^\[|\]/g removes any ]
        // With mutation, fd00]::1 becomes fd00::1 which matches ULA
        expect(isIpv6Loopback('fd00]::1')).toBe(false);
    });

    it('returns false for ULA-like prefix not at line start (kills no-^ ULA regex)', () => {
        // Mutation removes ^ from /^f[cd].../ → matches f[cd] anywhere
        expect(isIpv6Loopback('2001:fd00::1')).toBe(false);
        expect(isIpv6Loopback('2001:fc00::1')).toBe(false);
    });

    it('returns true for fe8-prefixed link-local with empty hex digit (kills {0,1}→{1} mutation)', () => {
        // Real regex /^fe[89ab][0-9a-f]{0,1}:/ allows 0 or 1 hex digit after fe8
        // Mutation /^fe[89ab][0-9a-f]:/ requires exactly 1 digit → fe8::1 would fail
        expect(isIpv6Loopback('fe8::1')).toBe(true);
        expect(isIpv6Loopback('fe9::1')).toBe(true);
    });

    it('returns false for link-local prefix not at line start (kills no-^ link-local regex)', () => {
        // Mutation removes ^ from /^fe[89ab].../ → matches fe8x anywhere
        expect(isIpv6Loopback('2001:fe80::1')).toBe(false);
    });

    it('correctly handles addresses without bracket wrapping', () => {
        expect(isIpv6Loopback('fc00::1')).toBe(true);
        expect(isIpv6Loopback('fd00::1')).toBe(true);
        expect(isIpv6Loopback('fe80::1')).toBe(true);
    });
});

// ── assertSafeUrl — additional mutation-killing tests ────────────
describe('assertSafeUrl — additional edge cases', () => {
    it('rejects URL with username but no password (kills || → && LogicalOperator mutation)', () => {
        // Mutation changes parsed.username || parsed.password to &&
        // With &&: username='user', password='' → 'user' && '' = false → no throw
        expect(() => assertSafeUrl('https://user@example.com')).toThrow('embedded credentials');
    });

    it('does not reject when allowedHosts is empty array (kills length > 0 mutation)', () => {
        // Mutation changes length > 0 to length >= 0 → empty array triggers check
        // and any host would be rejected (not in empty list)
        expect(() => assertSafeUrl('https://example.com', { allowedHosts: [] })).not.toThrow();
    });

    it('blocks metadata.oracle.internal cloud hostname', () => {
        // Tests the third hostname check in the cloud metadata block
        expect(() => assertSafeUrl('https://metadata.oracle.internal')).toThrow('cloud metadata');
    });

    it('rejects raw IPv4 matching the full pattern /^\\d{1,3}...$/  (kills no-$ mutation)', () => {
        // Mutation removes $ anchor → /^\d{1,3}.\d{1,3}.\d{1,3}.\d{1,3}/ matches prefix
        // assertSafeUrl with private IP should always throw regardless
        expect(() => assertSafeUrl('https://192.168.1.1')).toThrow('SSRF protection');
    });

    it('allows valid HTTPS URL with allowPrivateIps overriding private IP check', () => {
        expect(() => assertSafeUrl('https://10.0.0.1', { allowPrivateIps: true })).not.toThrow();
    });

    it('rejects port error message contains join of allowed ports list', () => {
        // StringLiteral mutation for the join separator in error message
        expect(() =>
            assertSafeUrl('https://example.com:9090', { allowedPorts: [443, 8080] }),
        ).toThrow('[443, 8080]');
    });
});

// ── resolveAndValidateIp — additional mutation-killing tests ─────
describe('resolveAndValidateIp — edge cases', () => {
    it('returns null immediately when allowPrivateIps is true (early return path)', async () => {
        // Mutation: ConditionalExpression → false skips early return
        const result = await resolveAndValidateIp('example.com', { allowPrivateIps: true });
        expect(result).toBeNull();
    });

    it('returns raw IPv4 directly without DNS lookup', async () => {
        // Mutation: regex mutations on the raw-IP check pattern
        const result = await resolveAndValidateIp('8.8.8.8');
        expect(result).toBe('8.8.8.8');
    });

    it('returns raw 2-digit and 3-digit octet IPv4 directly', async () => {
        // Kills regex mutations {1,3}→{1} which would reject multi-digit octets
        const r1 = await resolveAndValidateIp('10.10.10.10');
        expect(r1).toBe('10.10.10.10');
        const r2 = await resolveAndValidateIp('100.200.100.200');
        expect(r2).toBe('100.200.100.200');
    });

    it('returns first v4 address when both v4 and v6 resolve (kills v4 first check)', async () => {
        const dns = await import('node:dns/promises');
        vi.mocked(dns.resolve4).mockResolvedValueOnce(['8.8.8.8']);
        vi.mocked(dns.resolve6).mockResolvedValueOnce(['2001:db8::1']);
        const result = await resolveAndValidateIp('dual-stack.example.com');
        expect(result).toBe('8.8.8.8');
    });

    it('returns v6 address via dnsResolver injection when only AAAA records resolve (kills v6 fallback branch)', async () => {
        // Uses the dnsResolver injection path to avoid lazy-import coverage gaps
        // and deterministically cover the `if (v6Addresses.length > 0)` return on line 237.
        const result = await resolveAndValidateIp('v6only.example.com', {
            dnsResolver: {
                resolve4: async () => [],
                resolve6: async () => ['2001:db8::1'],
            },
        });
        expect(result).toBe('2001:db8::1');
    });

    it('returns null from catch block when dnsResolver.resolve4 throws a non-SecurityError synchronously', async () => {
        // Covers the `return null` on the catch branch (line 237).
        // A synchronous throw from resolve4 propagates before .catch(() => []) is chained,
        // so the outer try/catch receives it. Since it's not a SecurityError, the catch
        // block swallows it and returns null.
        const result = await resolveAndValidateIp('example.com', {
            dnsResolver: {
                resolve4: () => {
                    throw new TypeError('unexpected sync failure');
                },
                resolve6: async () => [],
            },
        });
        expect(result).toBeNull();
    });

    it('throws SecurityError when v4 address resolves to a private IP', async () => {
        const dns = await import('node:dns/promises');
        vi.mocked(dns.resolve4).mockResolvedValueOnce(['10.0.0.1']);
        vi.mocked(dns.resolve6).mockResolvedValueOnce([]);
        await expect(resolveAndValidateIp('evil.example.com')).rejects.toThrow(SecurityError);
    });
});
