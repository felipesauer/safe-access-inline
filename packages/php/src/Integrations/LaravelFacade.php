<?php

declare(strict_types=1);

namespace SafeAccessInline\Integrations;

use SafeAccessInline\Core\AbstractAccessor;

/**
 * Laravel Facade for safe-access-inline.
 *
 * Register in config/app.php aliases (Laravel 10 and below)
 * or auto-discovered via extra.laravel in composer.json (Laravel 11+).
 *
 * Usage:
 *   LaravelFacade::get('database.host');
 *   LaravelFacade::has('database.host');
 *   LaravelFacade::all();
 */
class LaravelFacade
{
    /**
     * Returns the facade accessor name registered in the container.
     */
    protected static function getFacadeAccessor(): string
    {
        return 'safe-access';
    }

    /**
     * Resolve the underlying accessor from the Laravel container.
     *
     * @param object $app Laravel application instance
     */
    public static function resolve(object $app): AbstractAccessor
    {
        /** @phpstan-ignore method.notFound */
        return $app->make(static::getFacadeAccessor());
    }

    /**
     * Forward static calls to the underlying AbstractAccessor.
     *
     * @param string $method
     * @param array<mixed> $arguments
     * @return mixed
     */
    public static function __callStatic(string $method, array $arguments): mixed
    {
        $app = static::getApplication();
        $accessor = static::resolve($app);

        return $accessor->$method(...$arguments);
    }

    /**
     * Retrieve the application container instance.
     *
     * @return object
     */
    protected static function getApplication(): object
    {
        /**
         * Uses the global app() helper when available (Laravel runtime).
         * Falls back to Container::getInstance() for testing/standalone.
         *
         * @phpstan-ignore function.notFound
         */
        if (function_exists('app')) {
            /** @phpstan-ignore function.notFound */
            return app();
        }

        // @codeCoverageIgnoreStart
        /** @phpstan-ignore class.notFound */
        return \Illuminate\Container\Container::getInstance();
        // @codeCoverageIgnoreEnd
    }
}
