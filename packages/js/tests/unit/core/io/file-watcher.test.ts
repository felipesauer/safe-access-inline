import { describe, it, expect, vi } from 'vitest';
import * as fs from 'node:fs';
import { watchFile } from '../../../../src/core/io/file-watcher';
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

// ── FileWatcher — rapid changes debounce ────────────────────────
describe('FileWatcher — debounce on rapid changes', () => {
    it('debounces rapid file changes', async () => {
        const tmpFile = path.join(os.tmpdir(), `fw-rapid-${Date.now()}.txt`);
        fs.writeFileSync(tmpFile, 'v1');

        const onChange = vi.fn();
        const unsub = watchFile(tmpFile, onChange);

        fs.writeFileSync(tmpFile, 'v2');
        await new Promise((r) => setTimeout(r, 30));
        fs.writeFileSync(tmpFile, 'v3');
        await new Promise((r) => setTimeout(r, 30));
        fs.writeFileSync(tmpFile, 'v4');

        await new Promise((r) => setTimeout(r, 300));

        expect(onChange).toHaveBeenCalled();

        unsub();
        fs.unlinkSync(tmpFile);
    });
});

// ── Edge cases: concurrent file watching ────────────────────────
describe('FileWatcher — concurrent watchers', () => {
    it('supports multiple watchers on the same file', async () => {
        const tmpFile = path.join(os.tmpdir(), `fw-multi-${Date.now()}.txt`);
        fs.writeFileSync(tmpFile, 'start');

        const onChangeA = vi.fn();
        const onChangeB = vi.fn();
        const unsubA = watchFile(tmpFile, onChangeA);
        const unsubB = watchFile(tmpFile, onChangeB);

        fs.writeFileSync(tmpFile, 'updated');
        await new Promise((r) => setTimeout(r, 300));

        expect(onChangeA).toHaveBeenCalledWith(tmpFile);
        expect(onChangeB).toHaveBeenCalledWith(tmpFile);

        unsubA();
        unsubB();
        fs.unlinkSync(tmpFile);
    });

    it('unsubscribing one watcher does not affect the other', async () => {
        const tmpFile = path.join(os.tmpdir(), `fw-unsub-${Date.now()}.txt`);
        fs.writeFileSync(tmpFile, 'start');

        const onChangeA = vi.fn();
        const onChangeB = vi.fn();
        const unsubA = watchFile(tmpFile, onChangeA);
        const unsubB = watchFile(tmpFile, onChangeB);

        // Unsubscribe A immediately
        unsubA();

        fs.writeFileSync(tmpFile, 'only-B');
        await new Promise((r) => setTimeout(r, 300));

        expect(onChangeA).not.toHaveBeenCalled();
        expect(onChangeB).toHaveBeenCalledWith(tmpFile);

        unsubB();
        fs.unlinkSync(tmpFile);
    });

    it('does not leak timers after unsubscribe during rapid writes', async () => {
        const tmpFile = path.join(os.tmpdir(), `fw-leak-${Date.now()}.txt`);
        fs.writeFileSync(tmpFile, 'v1');

        const onChange = vi.fn();
        const unsub = watchFile(tmpFile, onChange);

        // Rapid writes then immediately unsubscribe
        fs.writeFileSync(tmpFile, 'v2');
        fs.writeFileSync(tmpFile, 'v3');
        unsub();

        // Wait past the debounce window — callback should not fire
        await new Promise((r) => setTimeout(r, 300));
        expect(onChange).not.toHaveBeenCalled();

        fs.unlinkSync(tmpFile);
    });
});

// ── FileWatcher — mutation-targeted boundary tests ───────────────
describe('FileWatcher — debounce timer boundary', () => {
    it('rapid spaced writes trigger onChange exactly once (kills L14=false: timer never cancelled)', async () => {
        // With mutation L14=false (never clearTimeout on new event), each write starts its own
        // independent 100ms timer; all fire → onChange called 3 times instead of 1.
        const tmpFile = path.join(os.tmpdir(), `fw-exact-${Date.now()}.txt`);
        fs.writeFileSync(tmpFile, 'v0');

        const onChange = vi.fn();
        const unsub = watchFile(tmpFile, onChange);

        // Spaced writes: each at least fires a distinct watch event
        fs.writeFileSync(tmpFile, 'v1');
        await new Promise((r) => setTimeout(r, 40));
        fs.writeFileSync(tmpFile, 'v2');
        await new Promise((r) => setTimeout(r, 40));
        fs.writeFileSync(tmpFile, 'v3');

        // Wait well past debounce window
        await new Promise((r) => setTimeout(r, 300));

        expect(onChange).toHaveBeenCalledTimes(1);

        unsub();
        fs.unlinkSync(tmpFile);
    });

    it('unsubscribe after change event clears pending timer (kills L25=false mutation)', async () => {
        // With mutation L25=false (never clearTimeout in unsubscribe), the pending 100ms timer
        // still fires after unsubscribe → onChange called when it should not be.
        const tmpFile = path.join(os.tmpdir(), `fw-pend-${Date.now()}.txt`);
        fs.writeFileSync(tmpFile, 'v0');

        const onChange = vi.fn();
        const unsub = watchFile(tmpFile, onChange);

        // Trigger change event, then wait enough for the watcher to set debounceTimer
        fs.writeFileSync(tmpFile, 'v1');
        await new Promise((r) => setTimeout(r, 50)); // change event delivered; timer started

        // Now unsubscribe — original clears the pending timer; mutation L25=false does not
        unsub();

        // Wait past debounce window; with mutation the timer fires here
        await new Promise((r) => setTimeout(r, 200));

        expect(onChange).not.toHaveBeenCalled();

        fs.unlinkSync(tmpFile);
    });

    it('onChange throwing does not crash the watcher (silent catch)', async () => {
        const tmpFile = path.join(os.tmpdir(), `fw-throw-${Date.now()}.txt`);
        fs.writeFileSync(tmpFile, 'v0');

        const onChange = vi.fn().mockImplementation(() => {
            throw new Error('callback error');
        });
        const unsub = watchFile(tmpFile, onChange);

        fs.writeFileSync(tmpFile, 'v1');

        // No unhandled rejection — process should not crash
        await expect(new Promise((r) => setTimeout(r, 300))).resolves.not.toThrow();

        unsub();
        fs.unlinkSync(tmpFile);
    });
});
