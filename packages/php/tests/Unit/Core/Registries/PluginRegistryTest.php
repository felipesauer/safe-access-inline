<?php

declare(strict_types=1);

use SafeAccessInline\Contracts\ParserPluginInterface;
use SafeAccessInline\Contracts\SerializerPluginInterface;
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
});
