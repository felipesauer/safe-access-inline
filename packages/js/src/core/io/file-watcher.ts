import * as fs from 'node:fs';

/** Options accepted by {@link watchFile}. */
export interface FileWatcherOptions {
    /**
     * Milliseconds to wait after the last change event before invoking `onChange`.
     * Prevents multiple rapid invocations when the OS emits several events for a
     * single logical file write. Defaults to `100`.
     */
    readonly debounceMs?: number;
    /**
     * Optional error handler invoked when `onChange` throws.
     *
     * Without this callback, errors from `onChange` are silently discarded to
     * prevent unhandled promise rejections from leaking timer handles. Supplying
     * `onError` allows callers to observe and surface parse or reload failures.
     */
    readonly onError?: (err: unknown) => void;
}

/**
 * Watches a file for changes and invokes `onChange` after a debounce period.
 *
 * If `onChange` throws, the error is forwarded to `options.onError` (if supplied);
 * without a handler the error is silently discarded so timer handles are not leaked.
 *
 * @param filePath - Absolute path to the file to watch.
 * @param onChange - Callback receiving the file path on each change.
 * @param options - Debounce and error-handling overrides.
 * @returns A function that stops watching and clears pending timers.
 */
export function watchFile(
    filePath: string,
    onChange: (filePath: string) => void,
    options?: FileWatcherOptions,
): () => void {
    const debounceMs = options?.debounceMs ?? 100;
    let debounceTimer: ReturnType<typeof setTimeout> | null = null;

    const watcher = fs.watch(filePath, (_eventType: string) => {
        if (debounceTimer) clearTimeout(debounceTimer);
        debounceTimer = setTimeout(() => {
            try {
                onChange(filePath);
            } catch (err: unknown) {
                if (options?.onError) {
                    options.onError(err);
                }
                // Without onError, discard to prevent unhandled exceptions
                // from leaking timer handles.
            }
        }, debounceMs);
    });

    return () => {
        if (debounceTimer) clearTimeout(debounceTimer);
        watcher.close();
    };
}
