<?php

declare(strict_types=1);

namespace SafeAccessInline\Security;

/**
 * @phpstan-type AuditEventType 'file.read'|'file.watch'|'url.fetch'|'security.violation'|'data.mask'|'data.freeze'|'schema.validate'
 * @phpstan-type AuditEvent array{type: AuditEventType, timestamp: float, detail: array<string, mixed>}
 */
final class AuditLogger
{
    /** @var list<callable(array{type: string, timestamp: float, detail: array<string, mixed>}): void> */
    private static array $listeners = [];

    /**
     * @param callable(array{type: string, timestamp: float, detail: array<string, mixed>}): void $listener
     * @return callable(): void Unsubscribe function
     */
    public static function onAudit(callable $listener): callable
    {
        self::$listeners[] = $listener;
        return static function () use ($listener): void {
            $idx = array_search($listener, self::$listeners, true);
            if ($idx !== false) {
                array_splice(self::$listeners, $idx, 1);
            }
        };
    }

    /**
     * @param string $type
     * @param array<string, mixed> $detail
     */
    public static function emit(string $type, array $detail): void
    {
        if (self::$listeners === []) {
            return;
        }
        $event = [
            'type' => $type,
            'timestamp' => microtime(true),
            'detail' => $detail,
        ];
        foreach (self::$listeners as $listener) {
            $listener($event);
        }
    }

    public static function clearListeners(): void
    {
        self::$listeners = [];
    }
}
