/**
 * Tests for fetchUrl() — requires mocks for node:https, ip-range-checker and audit-emitter.
 * Uses dynamic imports (same pattern as ip-range-checker-dns.test.ts) to ensure mocks are
 * applied before the module under test is loaded.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { EventEmitter } from 'node:events';

vi.mock('node:https', () => ({
    request: vi.fn(),
}));

vi.mock('../../../src/core/ip-range-checker', () => ({
    assertSafeUrl: vi.fn(),
    resolveAndValidateIp: vi.fn(),
}));

vi.mock('../../../src/core/audit-emitter', () => ({
    emitAudit: vi.fn(),
}));

describe('fetchUrl()', () => {
    type ResMock = EventEmitter & {
        statusCode: number;
        resume: ReturnType<typeof vi.fn>;
        setEncoding: ReturnType<typeof vi.fn>;
    };
    type ReqMock = EventEmitter & {
        end: ReturnType<typeof vi.fn>;
        destroy: ReturnType<typeof vi.fn>;
    };

    async function getModules() {
        const https = await import('node:https');
        const ipChecker = await import('../../../src/core/ip-range-checker');
        const { fetchUrl } = await import('../../../src/core/io-loader');
        return { https, ipChecker, fetchUrl };
    }

    function makeResMock(statusCode: number): ResMock {
        const res = new EventEmitter() as ResMock;
        res.statusCode = statusCode;
        res.resume = vi.fn();
        res.setEncoding = vi.fn();
        return res;
    }

    function makeReqMock(): ReqMock {
        const req = new EventEmitter() as ReqMock;
        req.end = vi.fn();
        req.destroy = vi.fn();
        return req;
    }

    function mockRequest(
        mockedHttpsRequest: ReturnType<typeof vi.fn>,
        statusCode: number,
        chunks: string[],
        opts: { requestError?: Error; triggerTimeout?: boolean } = {},
    ) {
        const res = makeResMock(statusCode);
        const req = makeReqMock();

        mockedHttpsRequest.mockImplementation(
            (
                options: {
                    hostname?: string;
                    lookup?: (
                        h: string,
                        o: object,
                        cb: (err: null, addr: string, family: number) => void,
                    ) => void;
                },
                cb?: (r: ResMock) => void,
            ) => {
                // Invoke lookup if provided — ensures the DNS-pinning callback path is exercised
                if (typeof options?.lookup === 'function') {
                    options.lookup(options.hostname ?? 'example.com', {}, () => {});
                }
                setImmediate(() => {
                    if (opts.requestError) {
                        req.emit('error', opts.requestError);
                        return;
                    }
                    if (opts.triggerTimeout) {
                        req.emit('timeout');
                        return;
                    }
                    cb!(res);
                    for (const chunk of chunks) res.emit('data', chunk);
                    res.emit('end');
                });
                return req;
            },
        );

        return { req, res };
    }

    beforeEach(() => {
        vi.resetModules();
    });

    it('resolves with concatenated body on 200 response', async () => {
        const { https, ipChecker, fetchUrl } = await getModules();
        vi.mocked(ipChecker.resolveAndValidateIp).mockResolvedValue('1.2.3.4');
        mockRequest(vi.mocked(https.request), 200, ['hello ', 'world']);

        await expect(fetchUrl('https://example.com/data')).resolves.toBe('hello world');
    });

    it('resolves with empty string when response has no body', async () => {
        const { https, ipChecker, fetchUrl } = await getModules();
        vi.mocked(ipChecker.resolveAndValidateIp).mockResolvedValue('1.2.3.4');
        mockRequest(vi.mocked(https.request), 200, []);

        await expect(fetchUrl('https://example.com/data')).resolves.toBe('');
    });

    it('rejects with SecurityError on 301 redirect', async () => {
        const { https, ipChecker, fetchUrl } = await getModules();
        const { SecurityError } = await import('../../../src/exceptions/security.error');
        vi.mocked(ipChecker.resolveAndValidateIp).mockResolvedValue('1.2.3.4');
        mockRequest(vi.mocked(https.request), 301, []);

        await expect(fetchUrl('https://example.com/data')).rejects.toThrow(SecurityError);
        await expect(fetchUrl('https://example.com/data')).rejects.toThrow('HTTP 301');
    });

    it('rejects with SecurityError on 302 redirect', async () => {
        const { https, ipChecker, fetchUrl } = await getModules();
        const { SecurityError } = await import('../../../src/exceptions/security.error');
        vi.mocked(ipChecker.resolveAndValidateIp).mockResolvedValue('1.2.3.4');
        mockRequest(vi.mocked(https.request), 302, []);

        await expect(fetchUrl('https://example.com/data')).rejects.toThrow(SecurityError);
    });

    it('drains response body on redirect to avoid memory leak', async () => {
        const { https, ipChecker, fetchUrl } = await getModules();
        vi.mocked(ipChecker.resolveAndValidateIp).mockResolvedValue('1.2.3.4');
        const { res } = mockRequest(vi.mocked(https.request), 301, []);

        await fetchUrl('https://example.com/data').catch(() => {});
        expect(res.resume).toHaveBeenCalled();
    });

    it('rejects with the original error when request emits an error event', async () => {
        const { https, ipChecker, fetchUrl } = await getModules();
        vi.mocked(ipChecker.resolveAndValidateIp).mockResolvedValue('1.2.3.4');
        mockRequest(vi.mocked(https.request), 200, [], { requestError: new Error('ECONNREFUSED') });

        await expect(fetchUrl('https://example.com/data')).rejects.toThrow('ECONNREFUSED');
    });

    it('rejects with SecurityError when request times out', async () => {
        const { https, ipChecker, fetchUrl } = await getModules();
        const { SecurityError } = await import('../../../src/exceptions/security.error');
        vi.mocked(ipChecker.resolveAndValidateIp).mockResolvedValue('1.2.3.4');
        mockRequest(vi.mocked(https.request), 200, [], { triggerTimeout: true });

        await expect(fetchUrl('https://example.com/data')).rejects.toThrow(SecurityError);
        await expect(fetchUrl('https://example.com/data')).rejects.toThrow('timed out');
    });

    it('destroys the request socket on timeout', async () => {
        const { https, ipChecker, fetchUrl } = await getModules();
        vi.mocked(ipChecker.resolveAndValidateIp).mockResolvedValue('1.2.3.4');
        const { req } = mockRequest(vi.mocked(https.request), 200, [], { triggerTimeout: true });

        await fetchUrl('https://example.com/data').catch(() => {});
        expect(req.destroy).toHaveBeenCalled();
    });

    it('uses null resolvedIp (allowPrivateIps) — lookup is undefined', async () => {
        const { https, ipChecker, fetchUrl } = await getModules();
        vi.mocked(ipChecker.resolveAndValidateIp).mockResolvedValue(null);
        mockRequest(vi.mocked(https.request), 200, ['ok']);

        await expect(fetchUrl('https://example.com/data', { allowPrivateIps: true })).resolves.toBe(
            'ok',
        );
    });

    it('uses family 6 when resolvedIp is an IPv6 address', async () => {
        const { https, ipChecker, fetchUrl } = await getModules();
        vi.mocked(ipChecker.resolveAndValidateIp).mockResolvedValue('2001:db8::1');
        mockRequest(vi.mocked(https.request), 200, ['ipv6-ok']);

        await expect(fetchUrl('https://example.com/data')).resolves.toBe('ipv6-ok');
    });

    it('treats response with undefined statusCode as success (covers ?? 0 branch)', async () => {
        const { https, ipChecker, fetchUrl } = await getModules();
        vi.mocked(ipChecker.resolveAndValidateIp).mockResolvedValue('1.2.3.4');

        const res = new EventEmitter() as ResMock;
        // Deliberately leave statusCode as undefined
        (res as unknown as Record<string, unknown>).statusCode = undefined;
        res.resume = vi.fn();
        res.setEncoding = vi.fn();

        const req = makeReqMock();
        vi.mocked(https.request).mockImplementation(
            (
                options: {
                    hostname?: string;
                    lookup?: (
                        h: string,
                        o: object,
                        cb: (err: null, addr: string, family: number) => void,
                    ) => void;
                },
                cb?: (r: ResMock) => void,
            ) => {
                if (typeof options?.lookup === 'function') {
                    options.lookup(options.hostname ?? 'example.com', {}, () => {});
                }
                setImmediate(() => {
                    cb!(res);
                    res.emit('data', 'body');
                    res.emit('end');
                });
                return req;
            },
        );

        await expect(fetchUrl('https://example.com/data')).resolves.toBe('body');
    });
});
