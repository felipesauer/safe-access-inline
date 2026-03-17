<?php

declare(strict_types=1);

namespace SafeAccessInline\Security;

/**
 * @phpstan-type AuditEventType 'file.read'|'file.watch'|'url.fetch'|'security.violation'|'data.mask'|'data.freeze'|'schema.validate'
 * @phpstan-type AuditEvent array{type: AuditEventType, timestamp: float, detail: array<string, mixed>}
 */
final class AuditLogger
{
    private const MAX_LISTENERS = 100;

    /** @var list<callable(array{type: string, timestamp: float, detail: array<string, mixed>}): void> */
    private static array $listeners = [];

    /**
     * @param callable(array{type: string, timestamp: float, detail: array<string, mixed>}): void $listener
     * @return callable(): void Unsubscribe function
     * @throws \OverflowException When the maximum number of listeners is reached
     */
    public static function onAudit(callable $listener): callable
    {
        if (count(self::$listeners) >= self::MAX_LISTENERS) {
            throw new \OverflowException(
                '[AuditLogger] Max listener count (' . self::MAX_LISTENERS . ') reached. '
                . 'Possible memory leak — ensure onAudit() unsubscribers are called.'
            );
        }
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
