<?php

use SafeAccessInline\Core\PluginRegistry;
use SafeAccessInline\Contracts\ParserPluginInterface;
use SafeAccessInline\Contracts\SerializerPluginInterface;
use SafeAccessInline\Exceptions\UnsupportedTypeException;

beforeEach(function () {
    PluginRegistry::reset();
});

describe(PluginRegistry::class, function () {

    // ── Parser Registration ────────────────────────

    it('registers and retrieves a parser', function () {
        $parser = new class implements ParserPluginInterface {
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
        $parser1 = new class implements ParserPluginInterface {
            public function parse(string $raw): array { return ['v' => 1]; }
        };
        $parser2 = new class implements ParserPluginInterface {
            public function parse(string $raw): array { return ['v' => 2]; }
        };

        PluginRegistry::registerParser('yaml', $parser1);
        PluginRegistry::registerParser('yaml', $parser2);

        expect(PluginRegistry::getParser('yaml'))->toBe($parser2);
    });

    // ── Serializer Registration ────────────────────

    it('registers and retrieves a serializer', function () {
        $serializer = new class implements SerializerPluginInterface {
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
        $parser = new class implements ParserPluginInterface {
            public function parse(string $raw): array { return []; }
        };
        $serializer = new class implements SerializerPluginInterface {
            public function serialize(array $data): string { return ''; }
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
        $yamlParser = new class implements ParserPluginInterface {
            public function parse(string $raw): array { return ['format' => 'yaml']; }
        };
        $tomlParser = new class implements ParserPluginInterface {
            public function parse(string $raw): array { return ['format' => 'toml']; }
        };

        PluginRegistry::registerParser('yaml', $yamlParser);
        PluginRegistry::registerParser('toml', $tomlParser);

        expect(PluginRegistry::getParser('yaml')->parse(''))->toBe(['format' => 'yaml']);
        expect(PluginRegistry::getParser('toml')->parse(''))->toBe(['format' => 'toml']);
    });
});
