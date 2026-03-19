import * as fs from 'node:fs';

/**
 * Watches a file for changes and invokes `onChange` after a 100 ms debounce.
 *
 * @param filePath - Absolute path to the file to watch.
 * @param onChange - Callback receiving the file path on each change.
 * @returns A function that stops watching and clears pending timers.
 */
export function watchFile(filePath: string, onChange: (filePath: string) => void): () => void {
    let debounceTimer: ReturnType<typeof setTimeout> | null = null;

    const watcher = fs.watch(filePath, (_eventType: string) => {
        if (debounceTimer) clearTimeout(debounceTimer);
        debounceTimer = setTimeout(() => {
            try {
                onChange(filePath);
            } catch {
                // Prevent unhandled exceptions from leaking timer handles
            }
        }, 100);
    });

    return () => {
        if (debounceTimer) clearTimeout(debounceTimer);
        watcher.close();
    };
}
