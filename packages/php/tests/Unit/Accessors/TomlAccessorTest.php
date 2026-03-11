<?php

use SafeAccessInline\SafeAccess;
use SafeAccessInline\Accessors\TomlAccessor;
use SafeAccessInline\Core\PluginRegistry;
use SafeAccessInline\Contracts\ParserPluginInterface;
use SafeAccessInline\Exceptions\InvalidFormatException;

beforeEach(function () {
    PluginRegistry::reset();
});

/**
 * Helper: register a mock TOML parser that returns fixed data.
 */
function registerMockTomlParser(array $returnData = []): void
{
    PluginRegistry::registerParser('toml', new class ($returnData) implements ParserPluginInterface {
        public function __construct(private array $returnData) {}

        public function parse(string $raw): array
        {
            if ($this->returnData !== []) {
                return $this->returnData;
            }

            // Simple key = value parser for test data
            $result = [];
            foreach (explode("\n", trim($raw)) as $line) {
                $line = trim($line);
                if ($line === '' || str_starts_with($line, '#') || str_starts_with($line, '[')) {
                    continue;
                }
                if (str_contains($line, '=')) {
                    [$key, $value] = explode('=', $line, 2);
                    $trimmedValue = trim(trim($value), '"\'');

                    if (is_numeric($trimmedValue) && !str_contains($trimmedValue, '.')) {
                        $result[trim($key)] = (int) $trimmedValue;
                    } elseif ($trimmedValue === 'true') {
                        $result[trim($key)] = true;
                    } elseif ($trimmedValue === 'false') {
                        $result[trim($key)] = false;
                    } else {
                        $result[trim($key)] = $trimmedValue;
                    }
                }
            }
            return $result;
        }
    });
}

describe(TomlAccessor::class, function () {

    it('throws when no parser plugin is registered', function () {
        expect(fn () => SafeAccess::fromToml('key = "value"'))
            ->toThrow(InvalidFormatException::class, 'requires a TOML parser plugin');
    });

    it('from — valid TOML string with registered plugin', function () {
        registerMockTomlParser(['title' => 'My Config']);
        $accessor = TomlAccessor::from('title = "My Config"');
        expect($accessor)->toBeInstanceOf(TomlAccessor::class);
    });

    it('from — invalid type throws', function () {
        registerMockTomlParser();
        expect(fn () => TomlAccessor::from(123))
            ->toThrow(InvalidFormatException::class, 'expects a TOML string');
    });

    it('get — top-level key', function () {
        registerMockTomlParser(['title' => 'Test']);
        $accessor = TomlAccessor::from('title = "Test"');
        expect($accessor->get('title'))->toBe('Test');
    });

    it('get — section + key via nested data', function () {
        registerMockTomlParser(['db' => ['host' => 'localhost', 'port' => 5432]]);
        $accessor = TomlAccessor::from('ignored');
        expect($accessor->get('db.host'))->toBe('localhost');
        expect($accessor->get('db.port'))->toBe(5432);
    });

    it('get — nonexistent returns default', function () {
        registerMockTomlParser(['key' => 'value']);
        $accessor = TomlAccessor::from('key = "value"');
        expect($accessor->get('missing', 'fallback'))->toBe('fallback');
    });

    it('has — existing', function () {
        registerMockTomlParser(['key' => 'value']);
        $accessor = TomlAccessor::from('key = "value"');
        expect($accessor->has('key'))->toBeTrue();
    });

    it('has — nonexistent', function () {
        registerMockTomlParser(['key' => 'value']);
        $accessor = TomlAccessor::from('key = "value"');
        expect($accessor->has('nope'))->toBeFalse();
    });

    it('set — immutable', function () {
        registerMockTomlParser(['name' => 'old']);
        $accessor = TomlAccessor::from('name = "old"');
        $newAccessor = $accessor->set('name', 'new');
        expect($newAccessor->get('name'))->toBe('new');
        expect($accessor->get('name'))->toBe('old');
    });

    it('remove — immutable', function () {
        registerMockTomlParser(['a' => 1, 'b' => 2]);
        $accessor = TomlAccessor::from('a = 1');
        $newAccessor = $accessor->remove('b');
        expect($newAccessor->has('b'))->toBeFalse();
        expect($accessor->has('b'))->toBeTrue();
    });

    it('toArray', function () {
        registerMockTomlParser(['name' => 'Ana']);
        $accessor = TomlAccessor::from('name = "Ana"');
        $arr = $accessor->toArray();
        expect($arr)->toBe(['name' => 'Ana']);
    });

    it('toJson', function () {
        registerMockTomlParser(['name' => 'Ana']);
        $accessor = TomlAccessor::from('name = "Ana"');
        $json = $accessor->toJson();
        expect(json_decode($json, true))->toBe(['name' => 'Ana']);
    });

    it('count and keys', function () {
        registerMockTomlParser(['a' => 1, 'b' => 2, 'c' => 3]);
        $accessor = TomlAccessor::from('a = 1');
        expect($accessor->count())->toBe(3);
        expect($accessor->keys())->toBe(['a', 'b', 'c']);
    });
});
