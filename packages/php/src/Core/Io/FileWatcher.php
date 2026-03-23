<?php

declare(strict_types=1);

namespace SafeAccessInline\Core\Io;

/**
 * Polls a file for modifications using {@see filemtime()} and notifies a callback.
 *
 * Designed for development and lightweight production use; for high-throughput
 * environments prefer inotify or a dedicated file-watch daemon instead.
 *
 * @remarks
 * **Cross-Language Divergence:** The JS counterpart (`watchFile`) uses the native
 * `fs.watch()` API with a 100 ms debounce and returns a single `() => void` stop
 * function. This PHP implementation uses `filemtime()` polling (default 1 000 ms)
 * and returns `{poll: callable, stop: callable}` — appropriate for PHP-FPM and
 * CLI environments.
 *
 * **Fora do escopo (this cycle):** Migração para `ext-inotify`.
 * When `ext-inotify` is available (Linux only), replacing the `filemtime()` polling
 * loop with a kernel-level inotify watch would provide near-zero latency and no CPU
 * spin. Documented here as a possible future evolution. Example migration path:
 *
 * ```php
 * if (extension_loaded('inotify')) {
 *     $fd = inotify_init();
 *     inotify_add_watch($fd, $filePath, IN_MODIFY | IN_CLOSE_WRITE);
 *     // inotify_read() blocks until an event fires (no polling spin needed)
 * }
 * ```
 *
 * Until that migration is done, callers on high-frequency workloads should reduce
 * `$intervalMs` or use a dedicated file-watch daemon (e.g. watchexec, entr).
 */
final class FileWatcher
{
    /**
     * Watches a file for changes using polling (filemtime).
     * Returns an array with 'poll' (blocking loop) and 'stop' callables.
     *
     * The 'poll' callable starts a blocking while-loop that checks for file changes.
     * The 'stop' callable sets the flag to exit the loop after the current iteration.
     *
     * @param int $intervalMs Polling interval in milliseconds (default: 1000)
     * @param callable(int): void|null $sleepFn Custom sleep function for testing (receives microseconds)
     * @return array{poll: callable(): void, stop: callable(): void}
     */
    public static function watch(string $filePath, callable $onChange, int $intervalMs = 1000, ?callable $sleepFn = null): array
    {
        $sleep = $sleepFn ?? static function (int $us): void {
            usleep($us);
        };
        clearstatcache(true, $filePath);
        $lastMtime = file_exists($filePath) ? filemtime($filePath) : 0;
        $running = true;

        $poll = function () use ($filePath, $onChange, &$lastMtime, &$running, $intervalMs, $sleep): void {
            /** @phpstan-ignore while.alwaysTrue */
            while ($running) {
                clearstatcache(true, $filePath);
                $currentMtime = file_exists($filePath) ? filemtime($filePath) : 0;
                if ($currentMtime !== $lastMtime) {
                    $lastMtime = $currentMtime;
                    try {
                        $onChange($filePath);
                    } catch (\Throwable $e) {
                        error_log('[FileWatcher] onChange callback error: ' . $e->getMessage());
                    }
                }
                $sleep($intervalMs * 1000);
            }
        };

        return [
            'poll' => $poll,
            'stop' => function () use (&$running): void {
                $running = false;
            },
        ];
    }

    /**
     * Check once if a file has changed since the last known modification time.
     *
     * @return array{changed: bool, mtime: int}
     */
    public static function checkOnce(string $filePath, int $lastKnownMtime): array
    {
        clearstatcache(true, $filePath);
        $currentMtime = file_exists($filePath) ? (int) filemtime($filePath) : 0;
        return [
            'changed' => $currentMtime !== $lastKnownMtime,
            'mtime' => $currentMtime,
        ];
    }
}
