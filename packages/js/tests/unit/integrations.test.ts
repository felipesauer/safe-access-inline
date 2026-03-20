import { describe, it, expect, vi, afterEach } from 'vitest';
import {
    createSafeAccessProvider,
    createSafeAccessServiceProvider,
    SafeAccessModule,
    SafeAccessService,
    SAFE_ACCESS,
} from '../../src/integrations/nestjs';
import { safeAccessPlugin, loadConfig } from '../../src/integrations/vite';
import { SafeAccess } from '../../src/safe-access';
import { resolve } from 'node:path';

const FIXTURES = resolve(__dirname, '../fixtures');

afterEach(() => {
    vi.restoreAllMocks();
});

describe('NestJS Integration', () => {
    it('createSafeAccessProvider with inline data', async () => {
        const provider = createSafeAccessProvider({
            data: { host: 'localhost', port: 3000 },
            format: 'object',
        });
        expect(provider.provide).toBe(SAFE_ACCESS);
        const accessor = await provider.useFactory();
        expect(accessor.get('host')).toBe('localhost');
        expect(accessor.get('port')).toBe(3000);
    });

    it('createSafeAccessProvider with auto-detected data', async () => {
        const provider = createSafeAccessProvider({
            data: '{"key": "value"}',
        });
        const accessor = await provider.useFactory();
        expect(accessor.get('key')).toBe('value');
    });

    it('createSafeAccessProvider with filePath', async () => {
        const provider = createSafeAccessProvider({
            filePath: resolve(FIXTURES, 'config.json'),
            allowedDirs: [FIXTURES],
        });
        const accessor = await provider.useFactory();
        expect(accessor.get('app.name')).toBe('test-app');
    });

    it('createSafeAccessProvider with layerPaths', async () => {
        const provider = createSafeAccessProvider({
            layerPaths: [resolve(FIXTURES, 'config.json'), resolve(FIXTURES, 'override.json')],
            allowedDirs: [FIXTURES],
        });
        const accessor = await provider.useFactory();
        expect(accessor.get('app.name')).toBe('override-app');
        expect(accessor.get('app.debug')).toBe(true);
    });

    it('createSafeAccessProvider defaults to empty object', async () => {
        const provider = createSafeAccessProvider({});
        const accessor = await provider.useFactory();
        expect(accessor.all()).toEqual({});
    });

    it('SafeAccessModule.register returns module definition', () => {
        const mod = SafeAccessModule.register({ data: { x: 1 }, format: 'object' });
        expect(mod.providers).toHaveLength(2);
        expect(mod.exports).toContain(SAFE_ACCESS);
    });

    it('SAFE_ACCESS is a Symbol', () => {
        expect(typeof SAFE_ACCESS).toBe('symbol');
    });

    it('SafeAccessService wraps accessor with get/has/all', async () => {
        const provider = createSafeAccessServiceProvider({
            data: { server: { host: 'localhost', port: 8080 } },
            format: 'object',
        });
        const service = await provider.useFactory();
        expect(service).toBeInstanceOf(SafeAccessService);
        expect(service.get('server.host')).toBe('localhost');
        expect(service.get<number>('server.port')).toBe(8080);
        expect(service.get('missing', 'fallback')).toBe('fallback');
        expect(service.has('server.host')).toBe(true);
        expect(service.has('nope')).toBe(false);
        expect(service.all()).toEqual({ server: { host: 'localhost', port: 8080 } });
    });

    it('SafeAccessService.getMany returns multiple paths', async () => {
        const provider = createSafeAccessServiceProvider({
            data: { a: 1, b: 2 },
            format: 'object',
        });
        const service = await provider.useFactory();
        const result = service.getMany({ a: null, b: null });
        expect(result.a).toBe(1);
        expect(result.b).toBe(2);
    });

    it('SafeAccessModule exports SafeAccessService', () => {
        const mod = SafeAccessModule.register({ data: { x: 1 }, format: 'object' });
        expect(mod.exports).toContain(SafeAccessService);
    });
});

describe('Vite Integration', () => {
    it('loadConfig merges files', () => {
        const accessor = loadConfig(
            [resolve(FIXTURES, 'config.json'), resolve(FIXTURES, 'override.json')],
            { allowedDirs: [FIXTURES] },
        );
        expect(accessor.get('app.name')).toBe('override-app');
        expect(accessor.get('database.host')).toBe('localhost');
        expect(accessor.get('cache.driver')).toBe('redis');
    });

    it('loadConfig with empty files returns empty', () => {
        const accessor = loadConfig([]);
        expect(accessor.all()).toEqual({});
    });

    it('safeAccessPlugin returns Vite plugin object', () => {
        const plugin = safeAccessPlugin({
            files: [resolve(FIXTURES, 'config.json')],
        });
        expect(plugin.name).toBe('safe-access-config');
        expect(typeof plugin.resolveId).toBe('function');
        expect(typeof plugin.load).toBe('function');
        expect(typeof plugin.buildStart).toBe('function');
    });

    it('safeAccessPlugin resolves virtual module', () => {
        const plugin = safeAccessPlugin({
            files: [resolve(FIXTURES, 'config.json')],
        });
        expect(plugin.resolveId('virtual:safe-access-config')).toBe('\0virtual:safe-access-config');
        expect(plugin.resolveId('other-module')).toBeNull();
    });

    it('safeAccessPlugin loads config on buildStart', () => {
        const plugin = safeAccessPlugin({
            files: [resolve(FIXTURES, 'config.json')],
            allowedDirs: [FIXTURES],
        });
        (plugin.buildStart as () => void)();
        const code = plugin.load('\0virtual:safe-access-config') as string;
        expect(code).toContain('export default');
        expect(code).toContain('test-app');
    });

    it('safeAccessPlugin returns null for non-virtual modules', () => {
        const plugin = safeAccessPlugin({
            files: [resolve(FIXTURES, 'config.json')],
            allowedDirs: [FIXTURES],
        });
        expect(plugin.load('some-other-module')).toBeNull();
    });

    it('safeAccessPlugin supports custom virtualId', () => {
        const plugin = safeAccessPlugin({
            files: [resolve(FIXTURES, 'config.json')],
            virtualId: 'virtual:my-config',
        });
        expect(plugin.resolveId('virtual:my-config')).toBe('\0virtual:my-config');
        expect(plugin.resolveId('virtual:safe-access-config')).toBeNull();
    });

    it('safeAccessPlugin handleHotUpdate reloads watched files', () => {
        const plugin = safeAccessPlugin({
            files: [resolve(FIXTURES, 'config.json')],
            allowedDirs: [FIXTURES],
        });
        (plugin.buildStart as () => void)();

        let reloaded = false;
        const ctx = {
            file: resolve(FIXTURES, 'config.json'),
            server: {
                ws: {
                    send: () => {
                        reloaded = true;
                    },
                },
            },
        };
        plugin.handleHotUpdate(ctx);
        expect(reloaded).toBe(true);
    });

    it('safeAccessPlugin handleHotUpdate ignores non-watched files', () => {
        const plugin = safeAccessPlugin({
            files: [resolve(FIXTURES, 'config.json')],
            allowedDirs: [FIXTURES],
        });
        (plugin.buildStart as () => void)();

        let reloaded = false;
        const ctx = {
            file: '/some/other/file.json',
            server: {
                ws: {
                    send: () => {
                        reloaded = true;
                    },
                },
            },
        };
        plugin.handleHotUpdate(ctx);
        expect(reloaded).toBe(false);
    });

    it('safeAccessPlugin handleHotUpdate sends an error payload when reload fails', () => {
        const plugin = safeAccessPlugin({
            files: [resolve(FIXTURES, 'config.json')],
            allowedDirs: [FIXTURES],
        });
        (plugin.buildStart as () => void)();

        vi.spyOn(SafeAccess, 'fromFileSync').mockImplementation(() => {
            throw new Error('invalid config');
        });

        let message: unknown = null;
        const ctx = {
            file: resolve(FIXTURES, 'config.json'),
            server: {
                ws: {
                    send: (payload: unknown) => {
                        message = payload;
                    },
                },
            },
        };

        plugin.handleHotUpdate(ctx);

        expect(message).toEqual({
            type: 'error',
            err: {
                message: 'invalid config',
                stack: '',
            },
        });
    });

    it('safeAccessPlugin with empty files produces empty config', () => {
        const plugin = safeAccessPlugin({ files: [] });
        (plugin.buildStart as () => void)();
        const code = plugin.load('\0virtual:safe-access-config') as string;
        expect(code).toBe('export default {};');
    });
});
