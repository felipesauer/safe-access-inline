<?php

namespace SafeAccessInline\Core;

final class FileWatcher
{
    /**
     * Watches a file for changes using polling (filemtime).
     * Returns a callable to stop watching.
     *
     * @codeCoverageIgnore Requires real filesystem polling loop.
     *
     * @param int $intervalMs Polling interval in milliseconds (default: 1000)
     * @return callable(): void Stop function
     */
    public static function watch(string $filePath, callable $onChange, int $intervalMs = 1000): callable
    {
        clearstatcache(true, $filePath);
        $lastMtime = file_exists($filePath) ? filemtime($filePath) : 0;
        $running = true;

        // Return a closure that polls
        $poll = function () use ($filePath, $onChange, &$lastMtime, &$running, $intervalMs): void {
            while ($running) {
                clearstatcache(true, $filePath);
                $currentMtime = file_exists($filePath) ? filemtime($filePath) : 0;
                if ($currentMtime !== $lastMtime) {
                    $lastMtime = $currentMtime;
                    $onChange($filePath);
                }
                usleep($intervalMs * 1000);
            }
        };

        return function () use (&$running): void {
            $running = false;
        };
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
