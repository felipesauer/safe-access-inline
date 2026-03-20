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

vi.mock('../../../../src/security/sanitizers/ip-range-checker', () => ({
    assertSafeUrl: vi.fn(),
    resolveAndValidateIp: vi.fn(),
}));

vi.mock('../../../../src/security/audit/audit-emitter', () => ({
    emitAudit: vi.fn(),
}));

type ResMock = EventEmitter & {
    statusCode: number;
    resume: ReturnType<typeof vi.fn>;
    setEncoding: ReturnType<typeof vi.fn>;
};
type ReqMock = EventEmitter & {
    end: ReturnType<typeof vi.fn>;
    destroy: ReturnType<typeof vi.fn>;
};

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

describe('fetchUrl()', () => {
    async function getModules() {
        const https = await import('node:https');
        const ipChecker = await import('../../../../src/security/sanitizers/ip-range-checker');
        const { fetchUrl } = await import('../../../../src/core/io/io-loader');
        return { https, ipChecker, fetchUrl };
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
        const { SecurityError } = await import('../../../../src/exceptions/security.error');
        vi.mocked(ipChecker.resolveAndValidateIp).mockResolvedValue('1.2.3.4');
        mockRequest(vi.mocked(https.request), 301, []);

        await expect(fetchUrl('https://example.com/data')).rejects.toThrow(SecurityError);
        await expect(fetchUrl('https://example.com/data')).rejects.toThrow('HTTP 301');
    });

    it('rejects with SecurityError on 302 redirect', async () => {
        const { https, ipChecker, fetchUrl } = await getModules();
        const { SecurityError } = await import('../../../../src/exceptions/security.error');
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
        const { SecurityError } = await import('../../../../src/exceptions/security.error');
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

    it('rejects with SecurityError when response body exceeds maxPayloadBytes', async () => {
        const { https, ipChecker, fetchUrl } = await getModules();
        const { SecurityError } = await import('../../../../src/exceptions/security.error');
        vi.mocked(ipChecker.resolveAndValidateIp).mockResolvedValue('1.2.3.4');

        // Create a chunk that exceeds the 10MB default limit
        const largeChunk = 'x'.repeat(11 * 1024 * 1024);
        const res = makeResMock(200);
        const req = makeReqMock();
        (vi.mocked(https.request) as ReturnType<typeof vi.fn>).mockImplementation(
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
                    res.emit('data', largeChunk);
                });
                return req;
            },
        );

        await expect(fetchUrl('https://example.com/data')).rejects.toThrow(SecurityError);
        await expect(fetchUrl('https://example.com/data')).rejects.toThrow('exceeds maximum size');
        expect(req.destroy).toHaveBeenCalled();
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
        (vi.mocked(https.request) as ReturnType<typeof vi.fn>).mockImplementation(
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

    it('rejects with SecurityError on status code 300 (boundary: >= 300 throws)', async () => {
        // Kills EqualityOperator mutant: statusCode >= 300 → > 300
        // With original (>=): 300 >= 300 = true → SecurityError thrown ✓
        // With mutant (>):    300 > 300  = false → resolves (test would fail) ✗
        const { https, ipChecker, fetchUrl } = await getModules();
        const { SecurityError } = await import('../../../../src/exceptions/security.error');
        vi.mocked(ipChecker.resolveAndValidateIp).mockResolvedValue('1.2.3.4');
        mockRequest(vi.mocked(https.request), 300, []);

        await expect(fetchUrl('https://example.com/data')).rejects.toThrow(SecurityError);
        await expect(fetchUrl('https://example.com/data')).rejects.toThrow('HTTP 300');
    });

    it('resolves when body is exactly maxPayloadBytes (boundary: > maxBytes allows equal)', async () => {
        // Kills EqualityOperator mutant: received > maxBytes → >= maxBytes
        // With original (>):  exactly 10MB > 10MB = false → resolves ✓
        // With mutant (>=):   exactly 10MB >= 10MB = true → SecurityError (test would fail) ✗
        const { https, ipChecker, fetchUrl } = await getModules();
        vi.mocked(ipChecker.resolveAndValidateIp).mockResolvedValue('1.2.3.4');

        // 10MB ASCII string: Buffer.byteLength = exactly 10,485,760 bytes = DEFAULT maxPayloadBytes
        const exactChunk = 'x'.repeat(10 * 1024 * 1024);
        const res = makeResMock(200);
        const req = makeReqMock();
        (vi.mocked(https.request) as ReturnType<typeof vi.fn>).mockImplementation(
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
                    res.emit('data', exactChunk);
                    res.emit('end');
                });
                return req;
            },
        );

        await expect(fetchUrl('https://example.com/data')).resolves.toBe(exactChunk);
    });
});

describe('configureIoLoader()', () => {
    async function getModules() {
        const https = await import('node:https');
        const { fetchUrl, configureIoLoader, resetIoLoaderConfig } =
            await import('../../../../src/core/io/io-loader');
        return { https, fetchUrl, configureIoLoader, resetIoLoaderConfig };
    }

    beforeEach(() => {
        vi.resetModules();
    });

    it('configures and resets request timeout', async () => {
        const { https, fetchUrl, configureIoLoader, resetIoLoaderConfig } = await getModules();
        const { DEFAULT_IO_LOADER_CONFIG } =
            await import('../../../../src/core/config/io-loader-config');

        // Mock request to capture options
        vi.mocked(https.request).mockImplementation(
            (options: { timeout?: number }, cb: (res: ResMock) => void) => {
                const res = makeResMock(200);
                const req = makeReqMock();

                // Garantimos que o callback seja chamado com o mock do res
                setImmediate(() => {
                    cb(res);
                    res.emit('end');
                });

                return req;
            },
        );

        // Configure with a new timeout
        configureIoLoader({ requestTimeoutMs: 1000 });
        await fetchUrl('https://example.com');
        expect(vi.mocked(https.request)).toHaveBeenCalledWith(
            expect.objectContaining({ timeout: 1000 }),
            expect.any(Function),
        );

        // Reset and check for default
        resetIoLoaderConfig();
        await fetchUrl('https://example.com');
        expect(vi.mocked(https.request)).toHaveBeenCalledWith(
            expect.objectContaining({ timeout: DEFAULT_IO_LOADER_CONFIG.requestTimeoutMs }),
            expect.any(Function),
        );
    });

    it('DEFAULT_IO_LOADER_CONFIG includes connectTimeoutMs', async () => {
        const { DEFAULT_IO_LOADER_CONFIG: cfg } =
            await import('../../../../src/core/config/io-loader-config');
        expect(cfg.connectTimeoutMs).toBe(5_000);
    });

    it('configures connectTimeoutMs independently of requestTimeoutMs', async () => {
        const { configureIoLoader, resetIoLoaderConfig } = await getModules();
        const { DEFAULT_IO_LOADER_CONFIG: cfg } =
            await import('../../../../src/core/config/io-loader-config');
        configureIoLoader({ connectTimeoutMs: 2_000 });
        // requestTimeoutMs should remain at default
        expect(cfg.requestTimeoutMs).toBe(10_000);
        resetIoLoaderConfig();
    });
});
