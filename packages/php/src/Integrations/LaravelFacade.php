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
 *
 * @method static mixed   get(string $path, mixed $default = null)
 * @method static bool    has(string $path)
 * @method static array<mixed> all()
 * @method static array<mixed> toArray()
 * @method static static  set(string $path, mixed $value)
 * @method static static  remove(string $path)
 * @method static static  merge(array<mixed>|string $pathOrValue, array<mixed>|null $value = null)
 * @method static array<mixed> keys(?string $path = null)
 * @method static int     count(?string $path = null)
 * @method static string|null type(string $path)
 * @method static string  toJson(int $flags = 0)
 * @method static string  toYaml()
 * @method static static  mask(array<string> $patterns = [])
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
     * @return AbstractAccessor<array<mixed>> The resolved accessor instance.
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
         */
        if (function_exists('app')) {
            return app();
        }

        // @codeCoverageIgnoreStart — Container::getInstance() is only reachable without the app() helper; requires a full Laravel container boot (integration test only)
        /** @phpstan-ignore class.notFound */
        return \Illuminate\Container\Container::getInstance();
        // @codeCoverageIgnoreEnd
    }
}
