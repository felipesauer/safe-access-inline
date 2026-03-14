/**
 * Tests for assertResolvedIpNotPrivate — requires DNS mock.
 */
import { describe, it, expect, vi } from 'vitest';
import { SecurityError } from '../../../src/exceptions/security.error';

vi.mock('node:dns/promises', () => ({
    resolve4: vi.fn(),
}));

describe('assertResolvedIpNotPrivate()', () => {
    it('throws SecurityError when hostname resolves to a private IP', async () => {
        const dns = await import('node:dns/promises');
        vi.mocked(dns.resolve4).mockResolvedValueOnce(['10.0.0.1']);
        const { assertResolvedIpNotPrivate } = await import('../../../src/core/ip-range-checker');
        await expect(assertResolvedIpNotPrivate('evil-internal.example.com')).rejects.toThrow(
            SecurityError,
        );
    });

    it('silently ignores non-SecurityError DNS errors (ENOTFOUND)', async () => {
        const dns = await import('node:dns/promises');
        vi.mocked(dns.resolve4).mockRejectedValueOnce(new Error('ENOTFOUND'));
        const { assertResolvedIpNotPrivate } = await import('../../../src/core/ip-range-checker');
        await expect(assertResolvedIpNotPrivate('unknown.example.com')).resolves.toBeUndefined();
    });

    it('skips DNS check when allowPrivateIps is true', async () => {
        const { assertResolvedIpNotPrivate } = await import('../../../src/core/ip-range-checker');
        await expect(
            assertResolvedIpNotPrivate('anything', { allowPrivateIps: true }),
        ).resolves.toBeUndefined();
    });

    it('skips DNS lookup when hostname is already a raw IP address', async () => {
        const { assertResolvedIpNotPrivate } = await import('../../../src/core/ip-range-checker');
        await expect(assertResolvedIpNotPrivate('8.8.8.8')).resolves.toBeUndefined();
    });
});
