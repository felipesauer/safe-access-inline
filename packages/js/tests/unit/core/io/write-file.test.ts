import { describe, it, expect, afterEach } from 'vitest';
import * as path from 'node:path';
import * as fs from 'node:fs';
import * as fsp from 'node:fs/promises';
import * as os from 'node:os';
import { writeFileSync, writeFile } from '../../../../src/core/io/io-loader';
import { SecurityError } from '../../../../src/exceptions/security.error';
import { onAudit, clearAuditListeners } from '../../../../src/security/audit/audit-emitter';
import { AuditEventType } from '../../../../src/enums/audit-event-type.enum';
import { SafeAccess } from '../../../../src/safe-access';

const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'write-file-test-'));
const allowedDir = tmpDir;

afterEach(() => {
    clearAuditListeners();
});

describe('writeFileSync()', () => {
    it('writes content to a file within allowed dir', () => {
        const filePath = path.join(allowedDir, 'test-sync.json');
        writeFileSync(filePath, '{"ok":true}', { allowedDirs: [allowedDir] });
        expect(fs.readFileSync(filePath, 'utf-8')).toBe('{"ok":true}');
    });

    it('throws SecurityError for path outside allowedDirs', () => {
        expect(() => writeFileSync('/tmp/evil.json', 'bad', { allowedDirs: [allowedDir] })).toThrow(
            SecurityError,
        );
    });

    it('throws SecurityError for path with ../traversal', () => {
        expect(() =>
            writeFileSync(path.join(allowedDir, '../traversal.json'), 'bad', {
                allowedDirs: [allowedDir],
            }),
        ).toThrow(SecurityError);
    });

    it('allows any path with allowAnyPath: true', () => {
        const filePath = path.join(tmpDir, 'any-path.json');
        writeFileSync(filePath, '{"any":true}', { allowAnyPath: true });
        expect(fs.readFileSync(filePath, 'utf-8')).toBe('{"any":true}');
    });

    it('throws SecurityError when allowedDirs empty and allowAnyPath false', () => {
        expect(() => writeFileSync(path.join(allowedDir, 'fail.json'), 'data')).toThrow(
            SecurityError,
        );
    });

    it('emits AuditEvent FILE_WRITE on successful write', () => {
        const events: Array<{ type: string }> = [];
        onAudit((e) => events.push(e as { type: string }));
        const filePath = path.join(allowedDir, 'audited.json');
        writeFileSync(filePath, '{}', { allowedDirs: [allowedDir] });
        expect(events.some((e) => e.type === AuditEventType.FILE_WRITE)).toBe(true);
    });
});

describe('writeFile() [async]', () => {
    it('writes content to a file within allowed dir', async () => {
        const filePath = path.join(allowedDir, 'test-async.json');
        await writeFile(filePath, '{"ok":true}', { allowedDirs: [allowedDir] });
        expect(await fsp.readFile(filePath, 'utf-8')).toBe('{"ok":true}');
    });

    it('throws SecurityError for path outside allowedDirs', async () => {
        await expect(
            writeFile('/tmp/evil-async.json', 'bad', { allowedDirs: [allowedDir] }),
        ).rejects.toThrow(SecurityError);
    });

    it('throws SecurityError for path with ../traversal', async () => {
        await expect(
            writeFile(path.join(allowedDir, '../traversal-async.json'), 'bad', {
                allowedDirs: [allowedDir],
            }),
        ).rejects.toThrow(SecurityError);
    });

    it('allows any path with allowAnyPath: true', async () => {
        const filePath = path.join(tmpDir, 'any-path-async.json');
        await writeFile(filePath, '{"any":true}', { allowAnyPath: true });
        expect(await fsp.readFile(filePath, 'utf-8')).toBe('{"any":true}');
    });

    it('throws SecurityError when allowedDirs empty and allowAnyPath false', async () => {
        await expect(writeFile(path.join(allowedDir, 'fail-async.json'), 'data')).rejects.toThrow(
            SecurityError,
        );
    });

    it('emits AuditEvent FILE_WRITE on successful async write', async () => {
        const events: Array<{ type: string }> = [];
        onAudit((e) => events.push(e as { type: string }));
        const filePath = path.join(allowedDir, 'audited-async.json');
        await writeFile(filePath, '{}', { allowedDirs: [allowedDir] });
        expect(events.some((e) => e.type === AuditEventType.FILE_WRITE)).toBe(true);
    });
});

describe('SafeAccess.writeFile()', () => {
    it('delegates to writeFileSync with correct options', () => {
        const filePath = path.join(allowedDir, 'facade-sync.json');
        SafeAccess.writeFile(filePath, '{"facade":true}', { allowedDirs: [allowedDir] });
        expect(fs.readFileSync(filePath, 'utf-8')).toBe('{"facade":true}');
    });

    it('throws SecurityError for path outside allowedDirs', () => {
        expect(() =>
            SafeAccess.writeFile('/tmp/facade-evil.json', 'x', { allowedDirs: [allowedDir] }),
        ).toThrow(SecurityError);
    });
});

describe('SafeAccess.writeFileAsync()', () => {
    it('delegates to writeFile (async) with correct options', async () => {
        const filePath = path.join(allowedDir, 'facade-async.json');
        await SafeAccess.writeFileAsync(filePath, '{"facade":true}', { allowedDirs: [allowedDir] });
        expect(await fsp.readFile(filePath, 'utf-8')).toBe('{"facade":true}');
    });

    it('throws SecurityError for path outside allowedDirs', async () => {
        await expect(
            SafeAccess.writeFileAsync('/tmp/facade-async-evil.json', 'x', {
                allowedDirs: [allowedDir],
            }),
        ).rejects.toThrow(SecurityError);
    });
});
