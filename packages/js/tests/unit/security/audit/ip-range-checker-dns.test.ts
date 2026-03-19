/**
 * Tests for assertResolvedIpNotPrivate — requires DNS mock.
 */
import { describe, it, expect, vi } from 'vitest';
import { SecurityError } from '../../../../src/exceptions/security.error';

vi.mock('node:dns/promises', () => ({
    resolve4: vi.fn(),
    resolve6: vi.fn().mockResolvedValue([]),
}));

describe('assertResolvedIpNotPrivate()', () => {
    it('throws SecurityError when hostname resolves to a private IP', async () => {
        const dns = await import('node:dns/promises');
        vi.mocked(dns.resolve4).mockResolvedValueOnce(['10.0.0.1']);
        const { assertResolvedIpNotPrivate } =
            await import('../../../../src/security/sanitizers/ip-range-checker');
        await expect(assertResolvedIpNotPrivate('evil-internal.example.com')).rejects.toThrow(
            SecurityError,
        );
    });

    it('silently ignores non-SecurityError DNS errors (ENOTFOUND)', async () => {
        const dns = await import('node:dns/promises');
        vi.mocked(dns.resolve4).mockRejectedValueOnce(new Error('ENOTFOUND'));
        const { assertResolvedIpNotPrivate } =
            await import('../../../../src/security/sanitizers/ip-range-checker');
        await expect(assertResolvedIpNotPrivate('unknown.example.com')).resolves.toBeUndefined();
    });

    it('skips DNS check when allowPrivateIps is true', async () => {
        const { assertResolvedIpNotPrivate } =
            await import('../../../../src/security/sanitizers/ip-range-checker');
        await expect(
            assertResolvedIpNotPrivate('anything', { allowPrivateIps: true }),
        ).resolves.toBeUndefined();
    });

    it('skips DNS lookup when hostname is already a raw IP address', async () => {
        const { assertResolvedIpNotPrivate } =
            await import('../../../../src/security/sanitizers/ip-range-checker');
        await expect(assertResolvedIpNotPrivate('8.8.8.8')).resolves.toBeUndefined();
    });

    it('throws SecurityError when hostname resolves to a loopback IPv6 address', async () => {
        const dns = await import('node:dns/promises');
        vi.mocked(dns.resolve4).mockResolvedValueOnce([]);
        vi.mocked(dns.resolve6).mockResolvedValueOnce(['::1']);
        const { assertResolvedIpNotPrivate } =
            await import('../../../../src/security/sanitizers/ip-range-checker');
        await expect(assertResolvedIpNotPrivate('evil-v6.example.com')).rejects.toThrow(
            SecurityError,
        );
    });

    it('silently ignores AAAA DNS errors (ENOTFOUND for IPv6)', async () => {
        const dns = await import('node:dns/promises');
        vi.mocked(dns.resolve4).mockResolvedValueOnce(['1.2.3.4']);
        vi.mocked(dns.resolve6).mockRejectedValueOnce(new Error('ENOTFOUND'));
        const { assertResolvedIpNotPrivate } =
            await import('../../../../src/security/sanitizers/ip-range-checker');
        await expect(
            assertResolvedIpNotPrivate('public-v4only.example.com'),
        ).resolves.toBeUndefined();
    });

    it('resolveAndValidateIp throws SecurityError when AAAA record resolves to IPv6 loopback', async () => {
        const dns = await import('node:dns/promises');
        vi.mocked(dns.resolve4).mockResolvedValueOnce([]);
        vi.mocked(dns.resolve6).mockResolvedValueOnce(['::1']);
        const { resolveAndValidateIp } =
            await import('../../../../src/security/sanitizers/ip-range-checker');
        const { SecurityError } = await import('../../../../src/exceptions/security.error');
        await expect(resolveAndValidateIp('evil-v6only.example.com')).rejects.toThrow(
            SecurityError,
        );
    });
});
