<?php

declare(strict_types=1);

use SafeAccessInline\Contracts\ParserPluginInterface;
use SafeAccessInline\Contracts\SerializerPluginInterface;
use SafeAccessInline\Core\Config\PluginRegistryConfig;
use SafeAccessInline\Core\Registries\PluginRegistry;
use SafeAccessInline\Exceptions\UnsupportedTypeException;
use SafeAccessInline\Security\Audit\AuditLogger;

beforeEach(function () {
    PluginRegistry::reset();
    AuditLogger::clearListeners();
});

afterEach(function () {
    AuditLogger::clearListeners();
});

describe(PluginRegistry::class, function () {

    // ── Parser Registration ────────────────────────

    it('registers and retrieves a parser', function () {
        $parser = new class () implements ParserPluginInterface {
            public function parse(string $raw): array
            {
                return ['parsed' => true];
            }
        };

        PluginRegistry::registerParser('yaml', $parser);

        expect(PluginRegistry::hasParser('yaml'))->toBeTrue();
        expect(PluginRegistry::getParser('yaml'))->toBe($parser);
    });

    it('hasParser returns false for unregistered format', function () {
        expect(PluginRegistry::hasParser('yaml'))->toBeFalse();
    });

    it('getParser throws for unregistered format', function () {
        expect(fn () => PluginRegistry::getParser('yaml'))
            ->toThrow(UnsupportedTypeException::class, "No parser registered for format 'yaml'");
    });

    it('replaces parser when registering same format twice', function () {
        $parser1 = new class () implements ParserPluginInterface {
            public function parse(string $raw): array
            {
                return ['v' => 1];
            }
        };
        $parser2 = new class () implements ParserPluginInterface {
            public function parse(string $raw): array
            {
                return ['v' => 2];
            }
        };

        PluginRegistry::registerParser('yaml', $parser1);

        $events = [];
        AuditLogger::onAudit(function (array $event) use (&$events): void {
            $events[] = $event;
        });

        PluginRegistry::registerParser('yaml', $parser2);

        expect($events)->toHaveCount(1);
        expect($events[0]['type'])->toBe('plugin.overwrite');
        expect($events[0]['detail'])->toBe([
            'kind' => 'parser',
            'format' => 'yaml',
            'message' => "Parser for format 'yaml' is being overwritten.",
        ]);
        expect(PluginRegistry::getParser('yaml'))->toBe($parser2);
    });

    it('emits an audit event when overwriting a serializer', function () {
        $serializer1 = new class () implements SerializerPluginInterface {
            public function serialize(array $data): string
            {
                return 'v1';
            }
        };
        $serializer2 = new class () implements SerializerPluginInterface {
            public function serialize(array $data): string
            {
                return 'v2';
            }
        };

        PluginRegistry::registerSerializer('yaml', $serializer1);

        $events = [];
        AuditLogger::onAudit(function (array $event) use (&$events): void {
            $events[] = $event;
        });

        PluginRegistry::registerSerializer('yaml', $serializer2);

        expect($events)->toHaveCount(1);
        expect($events[0]['type'])->toBe('plugin.overwrite');
        expect($events[0]['detail'])->toBe([
            'kind' => 'serializer',
            'format' => 'yaml',
            'message' => "Serializer for format 'yaml' is being overwritten.",
        ]);
        expect(PluginRegistry::getSerializer('yaml'))->toBe($serializer2);
    });

    // ── Serializer Registration ────────────────────

    it('registers and retrieves a serializer', function () {
        $serializer = new class () implements SerializerPluginInterface {
            public function serialize(array $data): string
            {
                return 'serialized';
            }
        };

        PluginRegistry::registerSerializer('yaml', $serializer);

        expect(PluginRegistry::hasSerializer('yaml'))->toBeTrue();
        expect(PluginRegistry::getSerializer('yaml'))->toBe($serializer);
    });

    it('hasSerializer returns false for unregistered format', function () {
        expect(PluginRegistry::hasSerializer('yaml'))->toBeFalse();
    });

    it('getSerializer throws for unregistered format', function () {
        expect(fn () => PluginRegistry::getSerializer('xml'))
            ->toThrow(UnsupportedTypeException::class, "No serializer registered for format 'xml'");
    });

    // ── Reset ──────────────────────────────────────

    it('reset clears all registered plugins', function () {
        $parser = new class () implements ParserPluginInterface {
            public function parse(string $raw): array
            {
                return [];
            }
        };
        $serializer = new class () implements SerializerPluginInterface {
            public function serialize(array $data): string
            {
                return '';
            }
        };

        PluginRegistry::registerParser('yaml', $parser);
        PluginRegistry::registerSerializer('yaml', $serializer);

        expect(PluginRegistry::hasParser('yaml'))->toBeTrue();
        expect(PluginRegistry::hasSerializer('yaml'))->toBeTrue();

        PluginRegistry::reset();

        expect(PluginRegistry::hasParser('yaml'))->toBeFalse();
        expect(PluginRegistry::hasSerializer('yaml'))->toBeFalse();
    });

    // ── Multiple Formats ───────────────────────────

    it('supports multiple formats simultaneously', function () {
        $yamlParser = new class () implements ParserPluginInterface {
            public function parse(string $raw): array
            {
                return ['format' => 'yaml'];
            }
        };
        $tomlParser = new class () implements ParserPluginInterface {
            public function parse(string $raw): array
            {
                return ['format' => 'toml'];
            }
        };

        PluginRegistry::registerParser('yaml', $yamlParser);
        PluginRegistry::registerParser('toml', $tomlParser);

        expect(PluginRegistry::getParser('yaml')->parse(''))->toBe(['format' => 'yaml']);
        expect(PluginRegistry::getParser('toml')->parse(''))->toBe(['format' => 'toml']);
    });

    // ── Registry size limits ───────────────────────

    it('throws RangeException when max parser limit is exceeded', function () {
        $parser = new class () implements ParserPluginInterface {
            public function parse(string $raw): array
            {
                return [];
            }
        };

        for ($i = 0; $i < PluginRegistryConfig::DEFAULT_MAX_PARSERS; $i++) {
            PluginRegistry::registerParser("format-{$i}", $parser);
        }

        expect(fn () => PluginRegistry::registerParser('overflow-format', $parser))
            ->toThrow(
                \RangeException::class,
                sprintf('Max parser plugins (%d) reached.', PluginRegistryConfig::DEFAULT_MAX_PARSERS),
            );
    });

    it('does not count overwrite of existing format toward parser limit', function () {
        $parser = new class () implements ParserPluginInterface {
            public function parse(string $raw): array
            {
                return [];
            }
        };
        $overwrite = new class () implements ParserPluginInterface {
            public function parse(string $raw): array
            {
                return ['overwritten' => true];
            }
        };

        for ($i = 0; $i < PluginRegistryConfig::DEFAULT_MAX_PARSERS; $i++) {
            PluginRegistry::registerParser("format-{$i}", $parser);
        }

        // Re-registering an already-known format must not throw even at capacity
        PluginRegistry::registerParser('format-0', $overwrite);
        expect(PluginRegistry::getParser('format-0')->parse(''))->toBe(['overwritten' => true]);
    });

    it('throws RangeException when max serializer limit is exceeded', function () {
        $serializer = new class () implements SerializerPluginInterface {
            public function serialize(array $data): string
            {
                return '';
            }
        };

        for ($i = 0; $i < PluginRegistryConfig::DEFAULT_MAX_SERIALIZERS; $i++) {
            PluginRegistry::registerSerializer("format-{$i}", $serializer);
        }

        expect(fn () => PluginRegistry::registerSerializer('overflow-format', $serializer))
            ->toThrow(
                \RangeException::class,
                sprintf('Max serializer plugins (%d) reached.', PluginRegistryConfig::DEFAULT_MAX_SERIALIZERS),
            );
    });

    it('does not count overwrite of existing format toward serializer limit', function () {
        $serializer = new class () implements SerializerPluginInterface {
            public function serialize(array $data): string
            {
                return '';
            }
        };
        $overwrite = new class () implements SerializerPluginInterface {
            public function serialize(array $data): string
            {
                return 'overwritten';
            }
        };

        for ($i = 0; $i < PluginRegistryConfig::DEFAULT_MAX_SERIALIZERS; $i++) {
            PluginRegistry::registerSerializer("format-{$i}", $serializer);
        }

        // Re-registering an already-known format must not throw even at capacity
        PluginRegistry::registerSerializer('format-0', $overwrite);
        expect(PluginRegistry::getSerializer('format-0')->serialize([]))->toBe('overwritten');
    });

    // ── Isolated Instance (create()) ───────────────

    it('create() returns an isolated registry independent of the global default', function () {
        $parser = new class () implements ParserPluginInterface {
            public function parse(string $raw): array
            {
                return ['source' => 'global'];
            }
        };

        PluginRegistry::registerParser('yaml', $parser);

        $isolated = PluginRegistry::create();

        // Isolated instance must not see global registrations
        expect($isolated->hasParser('yaml'))->toBeFalse();
    });

    it('registrations on an isolated instance do not affect the global default', function () {
        $parser = new class () implements ParserPluginInterface {
            public function parse(string $raw): array
            {
                return ['source' => 'isolated'];
            }
        };

        $isolated = PluginRegistry::create();
        $isolated->registerParser('toml', $parser);

        // Global default must not be contaminated
        expect(PluginRegistry::hasParser('toml'))->toBeFalse();
    });

    it('two isolated instances are fully independent of each other', function () {
        $parser = new class () implements ParserPluginInterface {
            public function parse(string $raw): array
            {
                return [];
            }
        };

        $a = PluginRegistry::create();
        $b = PluginRegistry::create();

        $a->registerParser('csv', $parser);

        expect($a->hasParser('csv'))->toBeTrue();
        expect($b->hasParser('csv'))->toBeFalse();
    });

    it('getDefault() returns the same instance as the static facade', function () {
        $parser = new class () implements ParserPluginInterface {
            public function parse(string $raw): array
            {
                return [];
            }
        };

        PluginRegistry::registerParser('ini', $parser);

        expect(PluginRegistry::getDefault()->hasParser('ini'))->toBeTrue();
    });
});
