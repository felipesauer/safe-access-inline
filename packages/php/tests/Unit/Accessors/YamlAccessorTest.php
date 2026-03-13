<?php

use SafeAccessInline\Accessors\YamlAccessor;
use SafeAccessInline\Contracts\ParserPluginInterface;
use SafeAccessInline\Core\PluginRegistry;
use SafeAccessInline\Exceptions\InvalidFormatException;
use SafeAccessInline\SafeAccess;

beforeEach(function () {
    PluginRegistry::reset();
});

/**
 * Helper: register a mock YAML parser that handles simple key: value lines
 * and nested structures via associative arrays.
 */
function registerMockYamlParser(array $returnData = []): void
{
    PluginRegistry::registerParser('yaml', new class ($returnData) implements ParserPluginInterface {
        public function __construct(private array $returnData)
        {
        }

        public function parse(string $raw): array
        {
            if ($this->returnData !== []) {
                return $this->returnData;
            }

            // Simple line-by-line key: value parser for test data
            $lines = explode("\n", trim($raw));
            $result = [];
            foreach ($lines as $line) {
                if (str_contains($line, ':')) {
                    [$key, $value] = explode(':', $line, 2);
                    $trimmedValue = trim($value);

                    // Type coercion
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

describe(YamlAccessor::class, function () {

    it('works without plugin using symfony/yaml', function () {
        $accessor = SafeAccess::fromYaml("name: Ana\nage: 30");
        expect($accessor->get('name'))->toBe('Ana');
        expect($accessor->get('age'))->toBe(30);
    });

    it('prefers ext-yaml over symfony/yaml when available', function () {
        if (!function_exists('yaml_parse')) {
            $this->markTestSkipped('ext-yaml is not installed');
        }
        // Without any plugin, ext-yaml should be used (same result)
        $accessor = SafeAccess::fromYaml("name: Ana\nage: 30");
        expect($accessor->get('name'))->toBe('Ana');
        expect($accessor->get('age'))->toBe(30);
    });

    it('falls back to symfony/yaml when ext-yaml is not available', function () {
        $accessor = (new class ("name: Ana\nage: 30") extends YamlAccessor {
            protected function hasNativeYamlParse(): bool
            {
                return false;
            }
        });
        expect($accessor->get('name'))->toBe('Ana');
        expect($accessor->get('age'))->toBe(30);
    });

    it('from — valid YAML string with registered plugin', function () {
        registerMockYamlParser();
        $accessor = YamlAccessor::from("name: MyApp");
        expect($accessor)->toBeInstanceOf(YamlAccessor::class);
    });

    it('from — invalid type throws', function () {
        registerMockYamlParser();
        expect(fn () => YamlAccessor::from(123))
            ->toThrow(InvalidFormatException::class, 'expects a YAML string');
    });

    it('parses YAML using registered plugin', function () {
        registerMockYamlParser();
        $accessor = SafeAccess::fromYaml("name: Ana\nage: 30");

        expect($accessor->get('name'))->toBe('Ana');
        expect($accessor->get('age'))->toBe(30);
        expect($accessor->has('name'))->toBeTrue();
        expect($accessor->has('nonexistent'))->toBeFalse();
        expect($accessor->get('missing', 'default'))->toBe('default');
    });

    it('get — nonexistent returns default', function () {
        registerMockYamlParser();
        $accessor = YamlAccessor::from("key: value");
        expect($accessor->get('missing', 'fallback'))->toBe('fallback');
    });

    it('has — existing', function () {
        registerMockYamlParser();
        $accessor = YamlAccessor::from("name: Test");
        expect($accessor->has('name'))->toBeTrue();
    });

    it('has — nonexistent', function () {
        registerMockYamlParser();
        $accessor = YamlAccessor::from("name: Test");
        expect($accessor->has('missing'))->toBeFalse();
    });

    it('set — immutable', function () {
        registerMockYamlParser(['key' => 'original']);
        $original = SafeAccess::fromYaml('ignored');
        $modified = $original->set('key', 'changed');

        expect($original->get('key'))->toBe('original');
        expect($modified->get('key'))->toBe('changed');
    });

    it('remove — immutable', function () {
        registerMockYamlParser(['a' => 1, 'b' => 2]);
        $original = SafeAccess::fromYaml('ignored');
        $removed = $original->remove('a');

        expect($original->has('a'))->toBeTrue();
        expect($removed->has('a'))->toBeFalse();
        expect($removed->get('b'))->toBe(2);
    });

    it('returns all data as array', function () {
        registerMockYamlParser(['database' => ['host' => 'localhost', 'port' => 3306]]);
        $accessor = SafeAccess::fromYaml('ignored');
        expect($accessor->toArray())->toBe(['database' => ['host' => 'localhost', 'port' => 3306]]);
    });

    it('toJson', function () {
        registerMockYamlParser(['name' => 'Ana']);
        $accessor = SafeAccess::fromYaml('ignored');
        $json = $accessor->toJson();
        expect(json_decode($json, true))->toBe(['name' => 'Ana']);
    });

    it('supports nested dot notation access', function () {
        registerMockYamlParser(['database' => ['host' => 'localhost', 'port' => 3306]]);
        $accessor = SafeAccess::fromYaml('ignored');
        expect($accessor->get('database.host'))->toBe('localhost');
        expect($accessor->get('database.port'))->toBe(3306);
        expect($accessor->get('database.missing', 'fallback'))->toBe('fallback');
    });

    it('count and keys', function () {
        registerMockYamlParser(['a' => 1, 'b' => 2, 'c' => 3]);
        $accessor = SafeAccess::fromYaml('ignored');
        expect($accessor->count())->toBe(3);
        expect($accessor->keys())->toBe(['a', 'b', 'c']);
    });

    it('type returns correct types', function () {
        registerMockYamlParser(['name' => 'Ana', 'age' => 30, 'active' => true]);
        $accessor = SafeAccess::fromYaml('ignored');
        expect($accessor->type('name'))->toBe('string');
        expect($accessor->type('age'))->toBe('integer');
        expect($accessor->type('active'))->toBe('boolean');
    });

    it('handles empty YAML returning empty array via symfony', function () {
        $accessor = (new class ('   ') extends YamlAccessor {
            protected function hasNativeYamlParse(): bool
            {
                return false;
            }
        });
        expect($accessor->toArray())->toBe([]);
    });

    it('handles empty YAML returning empty array via native yaml_parse', function () {
        if (!function_exists('yaml_parse')) {
            $this->markTestSkipped('ext-yaml is not installed');
        }
        $accessor = YamlAccessor::from('   ');
        expect($accessor->toArray())->toBe([]);
    });

    it('throws InvalidFormatException for invalid YAML without plugin via symfony', function () {
        $accessor = fn () => new class (":\n  :\n invalid\nyaml: [") extends YamlAccessor {
            protected function hasNativeYamlParse(): bool
            {
                return false;
            }
        };
        expect($accessor)->toThrow(InvalidFormatException::class, 'failed to parse YAML');
    });
});
