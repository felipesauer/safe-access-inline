<?php

use SafeAccessInline\Core\Io\FileWatcher;

describe(FileWatcher::class, function () {

    it('checkOnce detects file changes', function () {
        $tmp = tempnam(sys_get_temp_dir(), 'fw_');
        file_put_contents($tmp, 'initial');
        clearstatcache(true, $tmp);
        $mtime = (int) filemtime($tmp);

        $result = FileWatcher::checkOnce($tmp, $mtime);
        expect($result['changed'])->toBeFalse();
        expect($result['mtime'])->toBe($mtime);

        // Simulate file change
        sleep(1);
        file_put_contents($tmp, 'changed');
        clearstatcache(true, $tmp);

        $result2 = FileWatcher::checkOnce($tmp, $mtime);
        expect($result2['changed'])->toBeTrue();
        expect($result2['mtime'])->not->toBe($mtime);

        unlink($tmp);
    });

    it('checkOnce handles non-existent files', function () {
        $result = FileWatcher::checkOnce('/tmp/nonexistent_fw_test_' . uniqid(), 0);
        expect($result['changed'])->toBeFalse();
        expect($result['mtime'])->toBe(0);
    });

    it('watch returns an array with poll and stop callables', function () {
        $watcher = FileWatcher::watch('/tmp/test.json', function () {
        });
        expect($watcher)->toBeArray();
        expect($watcher)->toHaveKeys(['poll', 'stop']);
        expect($watcher['poll'])->toBeCallable();
        expect($watcher['stop'])->toBeCallable();
    });

    // ── COV-003: watch() with injectable sleep ─────────

    it('watch detects file change with injectable sleep', function () {
        $tmp = tempnam(sys_get_temp_dir(), 'fw_watch_');
        file_put_contents($tmp, 'initial');

        $changedPaths = [];
        $iterations = 0;

        $watcher = FileWatcher::watch(
            $tmp,
            function (string $path) use (&$changedPaths): void {
                $changedPaths[] = $path;
            },
            1000,
            function (int $us) use (&$iterations, $tmp, &$watcher): void {
                $iterations++;
                if ($iterations === 1) {
                    // Simulate a file change on first sleep
                    sleep(1);
                    file_put_contents($tmp, 'changed');
                } elseif ($iterations >= 3) {
                    // Stop after 3 iterations
                    ($watcher['stop'])();
                }
            },
        );

        // Execute the poll loop — now it actually runs
        ($watcher['poll'])();

        expect($changedPaths)->toHaveCount(1);
        expect($changedPaths[0])->toBe($tmp);

        unlink($tmp);
    });

    it('watch handles onChange callback exception gracefully', function () {
        $tmp = tempnam(sys_get_temp_dir(), 'fw_err_');
        file_put_contents($tmp, 'initial');

        $iterations = 0;

        $watcher = FileWatcher::watch(
            $tmp,
            function (string $path): void {
                throw new \RuntimeException('callback error');
            },
            1000,
            function (int $us) use (&$iterations, $tmp, &$watcher): void {
                $iterations++;
                if ($iterations === 1) {
                    sleep(1);
                    file_put_contents($tmp, 'changed');
                } elseif ($iterations >= 2) {
                    ($watcher['stop'])();
                }
            },
        );

        // Should not throw — error is caught internally via error_log
        ($watcher['poll'])();
        expect($iterations)->toBeGreaterThanOrEqual(2);

        unlink($tmp);
    });

    it('watch stop function prevents further polling', function () {
        $iterations = 0;
        $watcher = FileWatcher::watch(
            '/tmp/test_stop_' . uniqid() . '.json',
            function () {
            },
            100,
            function (int $us) use (&$watcher, &$iterations): void {
                $iterations++;
                ($watcher['stop'])();
            },
        );
        ($watcher['poll'])();
        expect($iterations)->toBe(1);
    });
});

// ── Edge cases: concurrent watchers ─────────────────────────

describe(FileWatcher::class . ' — concurrent watchers', function (): void {
    it('supports multiple watchers on the same file via checkOnce', function () {
        $tmp = tempnam(sys_get_temp_dir(), 'fw_multi_');
        file_put_contents($tmp, 'start');
        clearstatcache(true, $tmp);
        $mtime = (int) filemtime($tmp);

        // Simulate a file change
        sleep(1);
        file_put_contents($tmp, 'updated');

        // Both "watchers" detect the change independently
        $resultA = FileWatcher::checkOnce($tmp, $mtime);
        $resultB = FileWatcher::checkOnce($tmp, $mtime);

        expect($resultA['changed'])->toBeTrue();
        expect($resultB['changed'])->toBeTrue();

        @unlink($tmp);
    });
});
