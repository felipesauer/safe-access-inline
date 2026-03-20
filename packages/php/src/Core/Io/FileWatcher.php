<?php

declare(strict_types=1);

namespace SafeAccessInline\Core\Io;

/**
 * Polls a file for modifications using {@see filemtime()} and notifies a callback.
 *
 * Designed for development and lightweight production use; for high-throughput
 * environments prefer inotify or a dedicated file-watch daemon instead.
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
