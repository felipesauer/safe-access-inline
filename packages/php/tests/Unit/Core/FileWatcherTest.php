<?php

use SafeAccessInline\Core\FileWatcher;

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

    it('watch returns a callable stop function', function () {
        $stop = FileWatcher::watch('/tmp/test.json', function () {
        });
        expect($stop)->toBeCallable();
    });
});
