<?php

use SafeAccessInline\Exceptions\SecurityException;
use SafeAccessInline\SafeAccess;
use SafeAccessInline\Security\AuditLogger;
use SafeAccessInline\Security\DataMasker;
use SafeAccessInline\Security\SecurityGuard;
use SafeAccessInline\Security\SecurityPolicy;

// ── SecurityPolicy ──────────────────────────────────────

describe(SecurityPolicy::class, function () {
    it('has sensible defaults', function () {
        $policy = new SecurityPolicy();
        expect($policy->maxDepth)->toBe(512);
        expect($policy->maxPayloadBytes)->toBe(10_485_760);
        expect($policy->maxKeys)->toBe(10_000);
        expect($policy->csvMode)->toBe('none');
        expect($policy->maskPatterns)->toBe([]);
        expect($policy->allowedDirs)->toBe([]);
        expect($policy->url)->toBeNull();
    });

    it('accepts custom values', function () {
        $policy = new SecurityPolicy(
            maxDepth: 100,
            maxPayloadBytes: 1024,
            csvMode: 'strip',
            maskPatterns: ['password'],
        );
        expect($policy->maxDepth)->toBe(100);
        expect($policy->maxPayloadBytes)->toBe(1024);
        expect($policy->csvMode)->toBe('strip');
        expect($policy->maskPatterns)->toBe(['password']);
    });

    it('merge overrides specific fields', function () {
        $policy = new SecurityPolicy();
        $merged = $policy->merge(['maxDepth' => 100, 'csvMode' => 'prefix']);
        expect($merged->maxDepth)->toBe(100);
        expect($merged->csvMode)->toBe('prefix');
        expect($merged->maxPayloadBytes)->toBe(10_485_760); // unchanged
    });

    it('merge merges url sub-array', function () {
        $policy = new SecurityPolicy(url: ['allowedPorts' => [443]]);
        $merged = $policy->merge(['url' => ['allowedHosts' => ['example.com']]]);
        expect($merged->url)->toBe([
            'allowedPorts' => [443],
            'allowedHosts' => ['example.com'],
        ]);
    });

    it('merge without url override preserves original', function () {
        $policy = new SecurityPolicy(url: ['allowedPorts' => [443]]);
        $merged = $policy->merge(['maxDepth' => 50]);
        expect($merged->url)->toBe(['allowedPorts' => [443]]);
    });
});

// ── AuditLogger ─────────────────────────────────────────

describe(AuditLogger::class, function () {
    afterEach(function () {
        AuditLogger::clearListeners();
    });

    it('emit does nothing without listeners', function () {
        AuditLogger::emit('file.read', ['filePath' => 'test.json']);
        expect(true)->toBeTrue(); // no exception
    });

    it('onAudit listener receives events', function () {
        $events = [];
        AuditLogger::onAudit(function (array $event) use (&$events) {
            $events[] = $event;
        });
        AuditLogger::emit('file.read', ['filePath' => 'test.json']);
        expect($events)->toHaveCount(1);
        expect($events[0]['type'])->toBe('file.read');
        expect($events[0]['detail']['filePath'])->toBe('test.json');
        expect($events[0]['timestamp'])->toBeGreaterThan(0);
    });

    it('multiple listeners receive events', function () {
        $events1 = [];
        $events2 = [];
        AuditLogger::onAudit(function (array $e) use (&$events1) {
            $events1[] = $e;
        });
        AuditLogger::onAudit(function (array $e) use (&$events2) {
            $events2[] = $e;
        });
        AuditLogger::emit('data.mask', ['patternCount' => 3]);
        expect($events1)->toHaveCount(1);
        expect($events2)->toHaveCount(1);
    });

    it('unsubscribe removes listener', function () {
        $events = [];
        $off = AuditLogger::onAudit(function (array $e) use (&$events) {
            $events[] = $e;
        });
        AuditLogger::emit('file.read', ['filePath' => 'a.json']);
        expect($events)->toHaveCount(1);
        $off();
        AuditLogger::emit('file.read', ['filePath' => 'b.json']);
        expect($events)->toHaveCount(1);
    });

    it('clearListeners removes all', function () {
        $events = [];
        AuditLogger::onAudit(function (array $e) use (&$events) {
            $events[] = $e;
        });
        AuditLogger::clearListeners();
        AuditLogger::emit('file.read', ['filePath' => 'c.json']);
        expect($events)->toHaveCount(0);
    });
});

// ── SafeAccess Integration ──────────────────────────────

describe('SafeAccess + SecurityPolicy/Audit', function () {
    afterEach(function () {
        AuditLogger::clearListeners();
    });

    it('SafeAccess::withPolicy auto-detects data', function () {
        $acc = SafeAccess::withPolicy(['name' => 'test'], new SecurityPolicy());
        expect($acc->get('name'))->toBe('test');
    });

    it('SafeAccess::withPolicy applies maskPatterns', function () {
        $policy = new SecurityPolicy(maskPatterns: ['password']);
        $acc = SafeAccess::withPolicy(
            ['user' => 'john', 'password' => 'secret'],
            $policy,
        );
        expect($acc->get('user'))->toBe('john');
        expect($acc->get('password'))->toBe('[REDACTED]');
    });

    it('SafeAccess::onAudit delegates to AuditLogger', function () {
        $events = [];
        $off = SafeAccess::onAudit(function (array $e) use (&$events) {
            $events[] = $e;
        });
        AuditLogger::emit('url.fetch', ['url' => 'https://example.com']);
        expect($events)->toHaveCount(1);
        $off();
    });

    it('SafeAccess::clearAuditListeners delegates', function () {
        $events = [];
        SafeAccess::onAudit(function (array $e) use (&$events) {
            $events[] = $e;
        });
        SafeAccess::clearAuditListeners();
        AuditLogger::emit('file.read', ['filePath' => 'd.json']);
        expect($events)->toHaveCount(0);
    });

    it('file read emits audit event', function () {
        $events = [];
        AuditLogger::onAudit(function (array $e) use (&$events) {
            $events[] = $e;
        });
        $tmp = tempnam(sys_get_temp_dir(), 'sa-audit-') . '.json';
        file_put_contents($tmp, '{"a":1}');
        try {
            SafeAccess::fromFile($tmp);
            $fileEvents = array_filter($events, fn ($e) => $e['type'] === 'file.read');
            expect($fileEvents)->not->toBeEmpty();
        } finally {
            unlink($tmp);
        }
    });

    it('data.mask emits audit event', function () {
        $events = [];
        AuditLogger::onAudit(function (array $e) use (&$events) {
            $events[] = $e;
        });
        DataMasker::mask(['password' => 'secret'], ['password']);
        $maskEvents = array_filter($events, fn ($e) => $e['type'] === 'data.mask');
        expect($maskEvents)->not->toBeEmpty();
    });

    it('security.violation emits audit on forbidden key', function () {
        $events = [];
        AuditLogger::onAudit(function (array $e) use (&$events) {
            $events[] = $e;
        });
        try {
            SecurityGuard::assertSafeKey('__proto__');
        } catch (SecurityException) {
            // expected
        }
        $violations = array_filter($events, fn ($e) => $e['type'] === 'security.violation');
        expect($violations)->not->toBeEmpty();
    });

    it('fromFileWithPolicy loads file with allowedDirs', function () {
        $tmp = tempnam(sys_get_temp_dir(), 'sa-policy-') . '.json';
        file_put_contents($tmp, '{"key":"value"}');
        try {
            $policy = new SecurityPolicy(allowedDirs: [sys_get_temp_dir()]);
            $acc = SafeAccess::fromFileWithPolicy($tmp, $policy);
            expect($acc->get('key'))->toBe('value');
        } finally {
            unlink($tmp);
        }
    });
});
