<?php

declare(strict_types=1);

namespace SafeAccessInline\Integrations;

use SafeAccessInline\Core\AbstractAccessor;
use SafeAccessInline\SafeAccess;

/**
 * Laravel Service Provider for safe-access-inline.
 *
 * Auto-discovered in Laravel 11+ via extra.laravel in composer.json.
 * For Laravel 10 and below, add to config/app.php providers array.
 *
 * Usage in service container:
 *   $accessor = app('safe-access'); // reads config/safe-access.php
 *   $accessor->get('database.host');
 *
 * Via Facade:
 *   LaravelFacade::get('database.host');
 *
 * Or inject directly:
 *   public function __construct(AbstractAccessor $config) { ... }
 */
class LaravelServiceProvider
{
    /**
     * Register bindings in the container.
     *
     * Requires the illuminate/support package. Type-hints are avoided
     * intentionally so this file can be shipped without requiring Laravel
     * as a hard dependency.
     *
     * @param object $app Laravel application instance
     */
    public static function register(object $app): void
    {
        require_once __DIR__ . '/helpers.php';

        /** @phpstan-ignore method.notFound */
        $app->singleton('safe-access', function ($app): AbstractAccessor {
            /** @var array<string, mixed> $config */
            $config = $app['config']->get('safe-access', []);
            return SafeAccess::from($config, 'array');
        });

        /** @phpstan-ignore method.notFound */
        $app->alias('safe-access', AbstractAccessor::class);
    }

    /**
     * Boot the service provider.
     *
     * @param object $app Laravel application instance
     */
    public static function boot(object $app): void
    {
        /** @phpstan-ignore method.notFound */
        $app->alias(LaravelFacade::class, 'SafeAccess');
    }

    /**
     * Creates an accessor from the full Laravel config repository.
     *
     * @param object $config Laravel config repository (\Illuminate\Config\Repository)
     */
    public static function fromConfig(object $config): AbstractAccessor
    {
        /** @phpstan-ignore method.notFound */
        return SafeAccess::from($config->all(), 'array');
    }

    /**
     * Creates an accessor from a specific Laravel config file.
     *
     * @param object $config Laravel config repository
     * @param string $key Config key (e.g. 'database', 'app')
     */
    public static function fromConfigKey(object $config, string $key): AbstractAccessor
    {
        /** @phpstan-ignore method.notFound */
        $data = $config->get($key, []);
        return SafeAccess::from(is_array($data) ? $data : [$key => $data], 'array');
    }
}
