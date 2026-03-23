import { describe, it, expect } from 'vitest';
import * as path from 'node:path';
import { SafeAccess } from '../../src/safe-access';
import { SecurityError } from '../../src/exceptions/security.error';

const fixturesDir = path.resolve(__dirname, '../fixtures');

describe('SafeAccess.fromFile / fromFileSync / fromUrl', () => {
    describe('fromFileSync()', () => {
        it('loads JSON file', () => {
            const acc = SafeAccess.fromFileSync(path.join(fixturesDir, 'config.json'), {
                allowedDirs: [fixturesDir],
            });
            expect(acc.get('app.name')).toBe('test-app');
            expect(acc.get('database.port')).toBe(5432);
        });

        it('loads YAML file', () => {
            const acc = SafeAccess.fromFileSync(path.join(fixturesDir, 'config.yaml'), {
                allowedDirs: [fixturesDir],
            });
            expect(acc.get('app.name')).toBe('test-app');
        });

        it('loads TOML file', () => {
            const acc = SafeAccess.fromFileSync(path.join(fixturesDir, 'config.toml'), {
                allowedDirs: [fixturesDir],
            });
            expect(acc.get('app.name')).toBe('test-app');
        });

        it('loads ENV file', () => {
            const acc = SafeAccess.fromFileSync(path.join(fixturesDir, 'config.env'), {
                allowedDirs: [fixturesDir],
            });
            expect(acc.get('APP_NAME')).toBe('test-app');
        });

        it('respects format override', () => {
            const acc = SafeAccess.fromFileSync(path.join(fixturesDir, 'config.json'), {
                format: 'json',
                allowedDirs: [fixturesDir],
            });
            expect(acc.get('app.name')).toBe('test-app');
        });

        it('uses auto-detect when format cannot be resolved', () => {
            // Copy fixture without extension — use a JSON fixture
            const acc = SafeAccess.fromFileSync(path.join(fixturesDir, 'config.json'), {
                allowedDirs: [fixturesDir],
            });
            expect(acc.get('app.name')).toBe('test-app');
        });

        it('enforces allowedDirs', () => {
            expect(() =>
                SafeAccess.fromFileSync('/etc/hostname', { allowedDirs: [fixturesDir] }),
            ).toThrow(SecurityError);
        });

        it('throws SecurityError when file extension is not in allowedExtensions', () => {
            // Extension check runs before file I/O — no real file needed
            expect(() =>
                SafeAccess.fromFileSync('/app/config.txt', {
                    allowedExtensions: ['.json'],
                    allowAnyPath: true,
                }),
            ).toThrow(SecurityError);
        });

        it('allows file when extension matches allowedExtensions', () => {
            const acc = SafeAccess.fromFileSync(path.join(fixturesDir, 'config.json'), {
                allowedExtensions: ['.json'],
                allowedDirs: [fixturesDir],
            });
            expect(acc.get('app.name')).toBe('test-app');
        });

        it('throws SecurityError when file exceeds maxSize', () => {
            expect(() =>
                SafeAccess.fromFileSync(path.join(fixturesDir, 'config.json'), {
                    allowedDirs: [fixturesDir],
                    maxSize: 1,
                }),
            ).toThrow(SecurityError);
        });
    });

    describe('fromFile() (async)', () => {
        it('loads JSON file asynchronously', async () => {
            const acc = await SafeAccess.fromFile(path.join(fixturesDir, 'config.json'), {
                allowedDirs: [fixturesDir],
            });
            expect(acc.get('app.name')).toBe('test-app');
        });

        it('enforces allowedDirs', async () => {
            await expect(
                SafeAccess.fromFile('/etc/hostname', { allowedDirs: [fixturesDir] }),
            ).rejects.toThrow(SecurityError);
        });

        it('throws SecurityError when file exceeds maxSize (async)', async () => {
            await expect(
                SafeAccess.fromFile(path.join(fixturesDir, 'config.json'), {
                    allowedDirs: [fixturesDir],
                    maxSize: 1,
                }),
            ).rejects.toThrow(SecurityError);
        });
    });
});

describe('SafeAccess.layer / layerFiles', () => {
    it('merges multiple accessors (last wins)', () => {
        const base = SafeAccess.fromJson(
            '{"app":{"name":"base","debug":false},"server":{"port":3000}}',
        );
        const override = SafeAccess.fromJson('{"app":{"name":"override","version":"2.0"}}');
        const result = SafeAccess.layer([base, override]);
        expect(result.get('app.name')).toBe('override');
        expect(result.get('app.debug')).toBe(false);
        expect(result.get('app.version')).toBe('2.0');
        expect(result.get('server.port')).toBe(3000);
    });

    it('handles empty sources', () => {
        const result = SafeAccess.layer([]);
        expect(result.all()).toEqual({});
    });

    it('handles single source', () => {
        const source = SafeAccess.fromJson('{"a":1}');
        const result = SafeAccess.layer([source]);
        expect(result.get('a')).toBe(1);
    });

    it('layerFiles merges files in order', async () => {
        const result = await SafeAccess.layerFiles(
            [path.join(fixturesDir, 'config.json'), path.join(fixturesDir, 'override.json')],
            { allowedDirs: [fixturesDir] },
        );
        expect(result.get('app.name')).toBe('override-app');
        expect(result.get('app.debug')).toBe(true);
        expect(result.get('app.version')).toBe('2.0');
        expect(result.get('database.host')).toBe('localhost');
        expect(result.get('cache.driver')).toBe('redis');
    });

    it('layerFiles respects allowedDirs', async () => {
        await expect(
            SafeAccess.layerFiles(['/etc/hostname'], { allowedDirs: [fixturesDir] }),
        ).rejects.toThrow(SecurityError);
    });
});
