/**
 * Tests for HttpClientInterface and DnsResolverInterface injection in fetchUrl().
 *
 * Verifies that custom HTTP clients and DNS resolvers can be injected via
 * configureIoLoader(), enabling full mock control in tests and custom
 * transport in production.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
    fetchUrl,
    configureIoLoader,
    resetIoLoaderConfig,
} from '../../../../src/core/io/io-loader';
import type {
    HttpClientInterface,
    HttpResponse,
} from '../../../../src/contracts/http-client.interface';
import type { DnsResolverInterface } from '../../../../src/contracts/dns-resolver.interface';

// Mock the SSRF/DNS dependencies so tests are deterministic and network-free
vi.mock('node:https', () => ({ request: vi.fn() }));
vi.mock('../../../../src/security/sanitizers/ip-range-checker', () => ({
    assertSafeUrl: vi.fn(),
    resolveAndValidateIp: vi.fn().mockResolvedValue('93.184.216.34'),
}));
vi.mock('../../../../src/security/audit/audit-emitter', () => ({
    AuditEventType: { URL_FETCH: 'url.fetch' },
    emitAudit: vi.fn(),
}));

function makeOkResponse(body: string): HttpResponse {
    return {
        ok: true,
        status: 200,
        text: vi.fn().mockResolvedValue(body),
        json: vi.fn().mockResolvedValue({}),
    };
}

afterEach(() => {
    resetIoLoaderConfig();
    vi.clearAllMocks();
});

// ── HttpClientInterface injection ────────────────────────────────────────────

describe('HttpClientInterface injection via configureIoLoader', () => {
    it('uses injected HttpClient when configured', async () => {
        const mockClient: HttpClientInterface = {
            fetch: vi.fn().mockResolvedValue(makeOkResponse('{"key":"injected"}')),
        };
        configureIoLoader({ httpClient: mockClient });

        const result = await fetchUrl('https://example.com/config.json');

        expect(result).toBe('{"key":"injected"}');
        expect(mockClient.fetch).toHaveBeenCalledWith(
            'https://example.com/config.json',
            expect.objectContaining({ timeout: expect.any(Number) }),
        );
    });

    it('throws SecurityError when injected client returns non-ok (HTTP 404)', async () => {
        const mockClient: HttpClientInterface = {
            fetch: vi
                .fn()
                .mockResolvedValue({ ok: false, status: 404, text: vi.fn(), json: vi.fn() }),
        };
        configureIoLoader({ httpClient: mockClient });

        await expect(fetchUrl('https://example.com/missing.json')).rejects.toThrow('HTTP 404');
    });

    it('throws SecurityError when injected client body exceeds maxPayloadBytes', async () => {
        const bigBody = 'x'.repeat(1_025);
        const mockClient: HttpClientInterface = {
            fetch: vi.fn().mockResolvedValue(makeOkResponse(bigBody)),
        };
        configureIoLoader({ httpClient: mockClient });

        await expect(
            fetchUrl('https://example.com/big.json', { maxPayloadBytes: 1_024 }),
        ).rejects.toThrow('exceeds maximum size');
    });

    it('still performs SSRF validation before delegating to injected client', async () => {
        const { assertSafeUrl } =
            await import('../../../../src/security/sanitizers/ip-range-checker');
        vi.mocked(assertSafeUrl).mockImplementationOnce(() => {
            throw new Error('SSRF blocked');
        });

        const mockClient: HttpClientInterface = { fetch: vi.fn() };
        configureIoLoader({ httpClient: mockClient });

        await expect(fetchUrl('https://example.com/')).rejects.toThrow('SSRF blocked');
        expect(mockClient.fetch).not.toHaveBeenCalled();
    });

    it('accepts any object satisfying HttpClientInterface (structural typing)', () => {
        const validClient: HttpClientInterface = {
            fetch: async (_url, _opts) => makeOkResponse('{}'),
        };
        expect(() => configureIoLoader({ httpClient: validClient })).not.toThrow();
    });
});

// ── DnsResolverInterface injection ───────────────────────────────────────────

describe('DnsResolverInterface injection via configureIoLoader', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('passes injected dnsResolver to resolveAndValidateIp', async () => {
        const { resolveAndValidateIp } =
            await import('../../../../src/security/sanitizers/ip-range-checker');
        const mockResolve = vi.mocked(resolveAndValidateIp);

        const mockDnsResolver: DnsResolverInterface = {
            resolve: vi.fn().mockResolvedValue(['93.184.216.34']),
            resolve4: vi.fn().mockResolvedValue(['93.184.216.34']),
        };
        configureIoLoader({
            httpClient: { fetch: vi.fn().mockResolvedValue(makeOkResponse('{}')) },
            dnsResolver: mockDnsResolver,
        });

        await fetchUrl('https://example.com/');

        expect(mockResolve).toHaveBeenCalledWith(
            'example.com',
            expect.objectContaining({ dnsResolver: mockDnsResolver }),
        );
    });

    it('uses custom dnsResolver for SSRF validation (resolveAndValidateIp unit)', async () => {
        const { resolveAndValidateIp: realResolve } = await vi.importActual<
            typeof import('../../../../src/security/sanitizers/ip-range-checker')
        >('../../../../src/security/sanitizers/ip-range-checker');

        const mockResolver: DnsResolverInterface = {
            resolve: vi.fn().mockResolvedValue(['93.184.216.34']),
            resolve4: vi.fn().mockResolvedValue(['93.184.216.34']),
            resolve6: vi.fn().mockResolvedValue([]),
        };

        const ip = await realResolve('example.com', { dnsResolver: mockResolver });
        expect(mockResolver.resolve4).toHaveBeenCalledWith('example.com');
        expect(ip).toBe('93.184.216.34');
    });

    it('injected dnsResolver blocks private IP via SSRF check', async () => {
        const { resolveAndValidateIp: realResolve } = await vi.importActual<
            typeof import('../../../../src/security/sanitizers/ip-range-checker')
        >('../../../../src/security/sanitizers/ip-range-checker');

        const evilResolver: DnsResolverInterface = {
            resolve: vi.fn().mockResolvedValue(['192.168.1.1']),
            resolve4: vi.fn().mockResolvedValue(['192.168.1.1']),
        };

        await expect(realResolve('evil.corp', { dnsResolver: evilResolver })).rejects.toThrow(
            'private IP',
        );
    });

    it('no-injection default: dnsResolver is undefined in resolveAndValidateIp call', async () => {
        const { resolveAndValidateIp } =
            await import('../../../../src/security/sanitizers/ip-range-checker');
        const mockResolve = vi.mocked(resolveAndValidateIp);

        // No custom client — configure only an httpClient so fetchUrl proceeds past https.request
        configureIoLoader({
            httpClient: { fetch: vi.fn().mockResolvedValue(makeOkResponse('{}')) },
            // dnsResolver intentionally omitted
        });

        await fetchUrl('https://example.com/');

        const [, callOptions] = mockResolve.mock.calls.at(-1) ?? [];
        expect((callOptions as { dnsResolver?: unknown } | undefined)?.dnsResolver).toBeUndefined();
    });
});
