import { describe, it, expect } from 'vitest';
import * as path from 'node:path';
import {
    readFileSync,
    readFile,
    resolveFormatFromExtension,
    assertPathWithinAllowedDirs,
} from '../../../src/core/io-loader';
import { SecurityError } from '../../../src/exceptions/security.error';
import { Format } from '../../../src/format.enum';

const fixturesDir = path.resolve(__dirname, '../../fixtures');

describe('io-loader', () => {
    describe('resolveFormatFromExtension()', () => {
        it.each([
            ['.json', Format.Json],
            ['.yaml', Format.Yaml],
            ['.yml', Format.Yaml],
            ['.toml', Format.Toml],
            ['.ini', Format.Ini],
            ['.cfg', Format.Ini],
            ['.csv', Format.Csv],
            ['.env', Format.Env],
            ['.ndjson', Format.Ndjson],
            ['.jsonl', Format.Ndjson],
            ['.xml', Format.Xml],
        ])('resolves %s to %s', (ext, expected) => {
            expect(resolveFormatFromExtension(`config${ext}`)).toBe(expected);
        });

        it('returns null for unknown extensions', () => {
            expect(resolveFormatFromExtension('file.unknown')).toBeNull();
        });
    });

    describe('assertPathWithinAllowedDirs()', () => {
        it('throws when no allowedDirs and no allowAnyPath', () => {
            expect(() => assertPathWithinAllowedDirs('/etc/passwd')).toThrow(SecurityError);
        });

        it('allows any path with allowAnyPath: true', () => {
            expect(() =>
                assertPathWithinAllowedDirs('/etc/passwd', undefined, { allowAnyPath: true }),
            ).not.toThrow();
        });

        it('allows paths within allowed directories', () => {
            expect(() =>
                assertPathWithinAllowedDirs(path.join(fixturesDir, 'config.json'), [fixturesDir]),
            ).not.toThrow();
        });

        it('rejects paths outside allowed directories', () => {
            expect(() => assertPathWithinAllowedDirs('/etc/passwd', [fixturesDir])).toThrow(
                SecurityError,
            );
        });

        it('rejects paths with null bytes', () => {
            expect(() => assertPathWithinAllowedDirs('config\0.yaml')).toThrow(SecurityError);
        });

        it('rejects path traversal attempts', () => {
            expect(() =>
                assertPathWithinAllowedDirs(path.join(fixturesDir, '../../etc/passwd'), [
                    fixturesDir,
                ]),
            ).toThrow(SecurityError);
        });

        it('falls back to path.resolve when allowed dir does not exist', () => {
            // The first dir does not exist — realpathSync fails — falls back to path.resolve
            expect(() =>
                assertPathWithinAllowedDirs(path.join(fixturesDir, 'config.json'), [
                    '/this/path/does/not/exist/at/all',
                    fixturesDir,
                ]),
            ).not.toThrow();
        });
    });

    describe('readFileSync()', () => {
        it('reads a file successfully', () => {
            const content = readFileSync(path.join(fixturesDir, 'config.json'), {
                allowedDirs: [fixturesDir],
            });
            expect(content).toContain('test-app');
        });

        it('reads with allowed dirs check', () => {
            const content = readFileSync(path.join(fixturesDir, 'config.json'), {
                allowedDirs: [fixturesDir],
            });
            expect(content).toContain('test-app');
        });

        it('rejects reads outside allowed dirs', () => {
            expect(() => readFileSync('/etc/hostname', { allowedDirs: [fixturesDir] })).toThrow(
                SecurityError,
            );
        });
    });

    describe('readFile() (async)', () => {
        it('reads a file asynchronously', async () => {
            const content = await readFile(path.join(fixturesDir, 'config.json'), {
                allowedDirs: [fixturesDir],
            });
            expect(content).toContain('test-app');
        });

        it('rejects reads outside allowed dirs', async () => {
            await expect(readFile('/etc/hostname', { allowedDirs: [fixturesDir] })).rejects.toThrow(
                SecurityError,
            );
        });
    });
});
