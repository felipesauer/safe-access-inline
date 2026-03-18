<?php

declare(strict_types=1);

namespace Tests\Unit\Integrations;

use SafeAccessInline\Core\AbstractAccessor;
use SafeAccessInline\Integrations\LaravelFacade;
use SafeAccessInline\Integrations\LaravelServiceProvider;
use SafeAccessInline\Integrations\SafeAccessBundle;
use SafeAccessInline\Integrations\SymfonyIntegration;
use SafeAccessInline\SafeAccess;

beforeEach(function (): void {
    $this->fixturesDir = realpath(__DIR__ . '/../../fixtures');
});

// ── Laravel Integration ─────────────────────────

describe('LaravelServiceProvider', function (): void {
    it('fromConfig creates accessor from config repository', function (): void {
        $mockConfig = new class () {
            public function all(): array
            {
                return ['app' => ['name' => 'test-app', 'debug' => true], 'database' => ['host' => 'localhost']];
            }
        };

        $accessor = LaravelServiceProvider::fromConfig($mockConfig);
        expect($accessor)->toBeInstanceOf(AbstractAccessor::class);
        expect($accessor->get('app.name'))->toBe('test-app');
        expect($accessor->get('database.host'))->toBe('localhost');
    });

    it('fromConfigKey creates accessor from specific config key', function (): void {
        $mockConfig = new class () {
            public function get(string $key, mixed $default = null): mixed
            {
                return match ($key) {
                    'database' => ['host' => 'localhost', 'port' => 5432],
                    default => $default,
                };
            }
        };

        $accessor = LaravelServiceProvider::fromConfigKey($mockConfig, 'database');
        expect($accessor)->toBeInstanceOf(AbstractAccessor::class);
        expect($accessor->get('host'))->toBe('localhost');
        expect($accessor->get('port'))->toBe(5432);
    });

    it('fromConfigKey wraps scalar values', function (): void {
        $mockConfig = new class () {
            public function get(string $key, mixed $default = null): mixed
            {
                return match ($key) {
                    'app_name' => 'my-app',
                    default => $default,
                };
            }
        };

        $accessor = LaravelServiceProvider::fromConfigKey($mockConfig, 'app_name');
        expect($accessor)->toBeInstanceOf(AbstractAccessor::class);
        expect($accessor->get('app_name'))->toBe('my-app');
    });

    it('register binds accessor to container', function (): void {
        $bindings = [];
        $aliases = [];
        $mockApp = new class ($bindings, $aliases) {
            /** @var array<string, callable> */
            public array $bindings;
            /** @var array<string, string> */
            public array $aliases;

            /**
             * @param array<string, callable> $bindings
             * @param array<string, string> $aliases
             */
            public function __construct(array &$bindings, array &$aliases)
            {
                $this->bindings = &$bindings;
                $this->aliases = &$aliases;
            }

            public function singleton(string $abstract, callable $concrete): void
            {
                $this->bindings[$abstract] = $concrete;
            }

            public function alias(string $abstract, string $alias): void
            {
                $this->aliases[$abstract] = $alias;
            }
        };

        LaravelServiceProvider::register($mockApp);
        expect($mockApp->bindings)->toHaveKey('safe-access');
        expect($mockApp->aliases)->toHaveKey('safe-access');
    });
});

// ── Symfony Integration ─────────────────────────

describe('SymfonyIntegration', function (): void {
    it('fromParameterBag creates accessor from parameters', function (): void {
        $mockBag = new class () {
            public function all(): array
            {
                return ['database_host' => 'localhost', 'database_port' => '5432', 'app.secret' => 'abc123'];
            }
        };

        $accessor = SymfonyIntegration::fromParameterBag($mockBag);
        expect($accessor)->toBeInstanceOf(AbstractAccessor::class);
        expect($accessor->get('database_host'))->toBe('localhost');
    });

    it('fromConfig creates accessor from config array', function (): void {
        $config = [
            'framework' => ['secret' => 'abc'],
            'doctrine' => ['dbal' => ['driver' => 'pdo_mysql']],
        ];

        $accessor = SymfonyIntegration::fromConfig($config);
        expect($accessor)->toBeInstanceOf(AbstractAccessor::class);
        expect($accessor->get('framework.secret'))->toBe('abc');
        expect($accessor->get('doctrine.dbal.driver'))->toBe('pdo_mysql');
    });

    it('fromYamlFile loads YAML config', function (): void {
        $accessor = SymfonyIntegration::fromYamlFile($this->fixturesDir . '/config.yaml', [$this->fixturesDir]);
        expect($accessor)->toBeInstanceOf(AbstractAccessor::class);
        expect($accessor->get('app.name'))->toBe('test-app');
    })->skip(!class_exists(\Symfony\Component\Yaml\Yaml::class), 'symfony/yaml not installed (run with deps=full to enable)');
});

// ── LaravelFacade ───────────────────────────────

describe('LaravelFacade', function (): void {
    it('resolve returns accessor from container', function (): void {
        $mockApp = new class () {
            public function make(string $abstract): AbstractAccessor
            {
                return SafeAccess::fromArray(['resolved' => true]);
            }
        };

        $accessor = LaravelFacade::resolve($mockApp);
        expect($accessor)->toBeInstanceOf(AbstractAccessor::class);
        expect($accessor->get('resolved'))->toBeTrue();
    });

    it('getFacadeAccessor returns safe-access', function (): void {
        // Use reflection to test protected method
        $ref = new \ReflectionMethod(LaravelFacade::class, 'getFacadeAccessor');
        $result = $ref->invoke(null);
        expect($result)->toBe('safe-access');
    });
    it('__callStatic forwards method calls to resolved accessor', function (): void {
        // We need a global app() function that returns our mock container
        // Since app() is already required by LaravelServiceProvider::register, we can test via it
        $mockAccessor = SafeAccess::fromArray(['name' => 'test']);
        $mockApp = new class ($mockAccessor) {
            private AbstractAccessor $accessor;

            public function __construct(AbstractAccessor $accessor)
            {
                $this->accessor = $accessor;
            }

            public function make(string $abstract): AbstractAccessor
            {
                return $this->accessor;
            }
        };

        // Override getApplication to return our mock app
        $facade = new class () extends LaravelFacade {
            public static ?object $testApp = null;

            protected static function getApplication(): object
            {
                return static::$testApp;
            }
        };

        $facade::$testApp = $mockApp;
        // __callStatic will call resolve()->get('name')
        $result = $facade::get('name');
        expect($result)->toBe('test');
        $facade::$testApp = null;
    });

    it('register singleton closure resolves accessor when called', function (): void {
        $resolvedAccessor = null;
        $bindings = [];
        $aliases = [];

        $mockConfig = new class () {
            public function get(string $key, mixed $default = null): mixed
            {
                return match ($key) {
                    'safe-access' => ['host' => 'localhost'],
                    default => $default,
                };
            }
        };

        $mockApp = new class ($bindings, $aliases, $mockConfig) implements \ArrayAccess {
            /** @var array<string, callable> */
            public array $bindings;
            /** @var array<string, string> */
            public array $aliases;
            public object $config;

            public function __construct(array &$bindings, array &$aliases, object $config)
            {
                $this->bindings = &$bindings;
                $this->aliases = &$aliases;
                $this->config = $config;
            }

            public function singleton(string $abstract, callable $concrete): void
            {
                $this->bindings[$abstract] = $concrete;
            }

            public function alias(string $abstract, string $alias): void
            {
                $this->aliases[$abstract] = $alias;
            }

            public function offsetExists(mixed $offset): bool
            {
                return $offset === 'config';
            }

            public function offsetGet(mixed $offset): mixed
            {
                if ($offset === 'config') {
                    return $this->config;
                }
                return null;
            }

            public function offsetSet(mixed $offset, mixed $value): void
            {
            }
            public function offsetUnset(mixed $offset): void
            {
            }

            public function __get(string $name): mixed
            {
                if ($name === 'config') {
                    return $this->config;
                }
                return null;
            }
        };

        LaravelServiceProvider::register($mockApp);

        // Now resolve the singleton closure to cover lines 44-45
        $factory = $mockApp->bindings['safe-access'];
        $accessor = $factory($mockApp);
        expect($accessor)->toBeInstanceOf(AbstractAccessor::class);
        expect($accessor->get('host'))->toBe('localhost');
    });
});

// ── SafeAccessBundle ────────────────────────────

describe('SafeAccessBundle', function (): void {
    it('getName returns bundle name', function (): void {
        $bundle = new SafeAccessBundle();
        expect($bundle->getName())->toBe('SafeAccessBundle');
    });

    it('loadExtension registers service from config_file', function (): void {
        $registered = new \ArrayObject();
        $mockDefinition = new class ($registered) {
            public function __construct(private \ArrayObject $reg)
            {
            }

            public function setFactory(array $factory): static
            {
                $this->reg['factory'] = $factory;
                return $this;
            }

            public function setArguments(array $args): static
            {
                $this->reg['arguments'] = $args;
                return $this;
            }

            public function setPublic(bool $public): static
            {
                $this->reg['public'] = $public;
                return $this;
            }
        };

        $mockContainer = new class ($mockDefinition) {
            public function __construct(private readonly object $definition)
            {
            }

            public function register(string $id, string $class): object
            {
                return $this->definition;
            }
        };

        $bundle = new SafeAccessBundle();
        $bundle->loadExtension(['config_file' => '/tmp/config.json'], $mockContainer);
        expect($registered['arguments'])->toBe(['/tmp/config.json']);
        expect($registered['public'])->toBeTrue();
    });

    it('loadExtension registers service from data array', function (): void {
        $registered = new \ArrayObject();
        $mockDefinition = new class ($registered) {
            public function __construct(private \ArrayObject $reg)
            {
            }

            public function setFactory(array $factory): static
            {
                $this->reg['factory'] = $factory;
                return $this;
            }

            public function setArguments(array $args): static
            {
                $this->reg['arguments'] = $args;
                return $this;
            }

            public function setPublic(bool $public): static
            {
                $this->reg['public'] = $public;
                return $this;
            }
        };

        $mockContainer = new class ($mockDefinition) {
            public function __construct(private readonly object $definition)
            {
            }

            public function register(string $id, string $class): object
            {
                return $this->definition;
            }
        };

        $bundle = new SafeAccessBundle();
        $bundle->loadExtension(['data' => ['key' => 'value']], $mockContainer);
        expect($registered['arguments'])->toBe([['key' => 'value'], 'array']);
        expect($registered['public'])->toBeTrue();
    });
});

// ── LaravelServiceProvider::boot ────────────────

describe('LaravelServiceProvider::boot', function (): void {
    it('boot registers facade alias', function (): void {
        $aliases = new \ArrayObject();
        $mockApp = new class ($aliases) {
            public function __construct(private \ArrayObject $aliases)
            {
            }

            public function alias(string $abstract, string $alias): void
            {
                $this->aliases[$abstract] = $alias;
            }
        };

        LaravelServiceProvider::boot($mockApp);
        expect($aliases->offsetExists(LaravelFacade::class))->toBeTrue();
        expect($aliases[LaravelFacade::class])->toBe('SafeAccess');
    });
});
