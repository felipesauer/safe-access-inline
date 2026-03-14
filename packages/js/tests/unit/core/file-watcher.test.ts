import { describe, it, expect, vi } from 'vitest';
import * as fs from 'node:fs';
import { watchFile } from '../../../src/core/file-watcher';
import * as path from 'node:path';
import * as os from 'node:os';

describe('FileWatcher', () => {
    it('returns an unsubscribe function that can be called', () => {
        // Use a real temp file for the watcher
        const tmpFile = path.join(os.tmpdir(), `fw-test-${Date.now()}.txt`);
        fs.writeFileSync(tmpFile, 'initial');

        const onChange = vi.fn();
        const unsubscribe = watchFile(tmpFile, onChange);
        expect(typeof unsubscribe).toBe('function');
        unsubscribe();

        fs.unlinkSync(tmpFile);
    });

    it('calls onChange when file changes (debounced)', async () => {
        const tmpFile = path.join(os.tmpdir(), `fw-test-${Date.now()}.txt`);
        fs.writeFileSync(tmpFile, 'initial');

        const onChange = vi.fn();
        const unsubscribe = watchFile(tmpFile, onChange);

        // Trigger a real file change
        fs.writeFileSync(tmpFile, 'changed');

        // Wait for debounce (100ms) + buffer
        await new Promise((r) => setTimeout(r, 300));

        expect(onChange).toHaveBeenCalledWith(tmpFile);

        unsubscribe();
        fs.unlinkSync(tmpFile);
    });
});
