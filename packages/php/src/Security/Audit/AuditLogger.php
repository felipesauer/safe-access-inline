<?php

declare(strict_types=1);

namespace SafeAccessInline\Security\Audit;

use SafeAccessInline\Core\Config\AuditConfig;

/**
 * @phpstan-type AuditEventType 'file.read'|'file.watch'|'url.fetch'|'security.violation'|'security.deprecation'|'data.mask'|'data.freeze'|'schema.validate'|'plugin.overwrite'
 * @phpstan-type AuditEvent array{type: AuditEventType, timestamp: float, detail: array<string, mixed>}
 */
final class AuditLogger
{
    /** Active audit configuration, lazily initialised on first access. */
    private static AuditConfig $config;

    /**
     * Returns the active audit configuration, lazily initialised with defaults.
     *
     * @return AuditConfig The current configuration.
     */
    private static function config(): AuditConfig
    {
        return self::$config ??= new AuditConfig();
    }

    /**
     * Replaces the active configuration.
     *
     * @param AuditConfig $config New configuration to apply.
     */
    public static function configure(AuditConfig $config): void
    {
        self::$config = $config;
    }

    /** @var list<callable(array{type: string, timestamp: float, detail: array<string, mixed>}): void> Registered audit listeners. */
    private static array $listeners = [];

    /**
     * @param callable(array{type: string, timestamp: float, detail: array<string, mixed>}): void $listener
     * @return callable(): void Unsubscribe function
     * @throws \OverflowException When the maximum number of listeners is reached
     */
    public static function onAudit(callable $listener): callable
    {
        if (count(self::$listeners) >= self::config()->maxListeners) {
            throw new \OverflowException(
                '[AuditLogger] Max listener count (' . self::config()->maxListeners . ') reached. '
                . 'Call the returned unsubscriber function or clearListeners() before registering new listeners.'
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
     * Dispatches an audit event to all registered listeners.
     *
     * Each listener receives an event array containing `type`, `timestamp`,
     * and `detail` keys. Listener exceptions are caught and silenced so that
     * a failing listener never interrupts application flow.
     *
     * @param string               $type   Audit event type (e.g. `'file.read'`).
     * @param array<string, mixed> $detail Contextual data attached to the event.
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
        $snapshot = self::$listeners;
        foreach ($snapshot as $listener) {
            try {
                $listener($event);
            } catch (\Throwable) {
                // Isolate listener errors so subsequent listeners still fire
            }
        }
    }

    /**
     * Removes all registered audit listeners.
     */
    public static function clearListeners(): void
    {
        self::$listeners = [];
    }
}
