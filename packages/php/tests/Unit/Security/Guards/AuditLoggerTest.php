<?php

declare(strict_types=1);

use SafeAccessInline\Contracts\AuditEvent;
use SafeAccessInline\Core\Config\AuditConfig;
use SafeAccessInline\Enums\AuditEventType;
use SafeAccessInline\Security\Audit\AuditLogger;

describe(AuditLogger::class, function () {

    afterEach(function () {
        AuditLogger::clearListeners();
        AuditLogger::configure(new AuditConfig()); // restore default
    });

    // ── configure — maxListeners ─────────────────────────────────

    it('configure — custom maxListeners limit throws OverflowException when exceeded', function () {
        AuditLogger::configure(new AuditConfig(maxListeners: 1));
        AuditLogger::onAudit(fn ($e) => null); // first listener: OK
        AuditLogger::onAudit(fn ($e) => null); // second listener: exceeds limit
    })->throws(\OverflowException::class);

    // ── AuditEvent DTO ───────────────────────────────────────

    it('AuditEvent — constructor stores type, timestamp and detail', function () {
        $event = new AuditEvent(
            type:      AuditEventType::FILE_READ,
            timestamp: 1_700_000_000.0,
            detail:    ['filePath' => 'data.json'],
        );

        expect($event->type)->toBe(AuditEventType::FILE_READ)
            ->and($event->timestamp)->toBe(1_700_000_000.0)
            ->and($event->detail)->toBe(['filePath' => 'data.json']);
    });

    it('emit — isolates listener errors so subsequent listeners still fire', function () {
        $calls = [];
        AuditLogger::onAudit(function () {
            throw new \RuntimeException('boom');
        });
        AuditLogger::onAudit(function () use (&$calls) {
            $calls[] = 'second';
        });
        AuditLogger::emit('test.error_isolation', ['key' => 'val']);
        expect($calls)->toBe(['second']);
    });
});
