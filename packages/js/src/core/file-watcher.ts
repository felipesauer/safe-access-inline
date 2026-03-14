import * as fs from 'node:fs';

export function watchFile(filePath: string, onChange: (filePath: string) => void): () => void {
    let debounceTimer: ReturnType<typeof setTimeout> | null = null;

    const watcher = fs.watch(filePath, (_eventType: string) => {
        if (debounceTimer) clearTimeout(debounceTimer);
        debounceTimer = setTimeout(() => {
            onChange(filePath);
        }, 100);
    });

    return () => {
        if (debounceTimer) clearTimeout(debounceTimer);
        watcher.close();
    };
}
