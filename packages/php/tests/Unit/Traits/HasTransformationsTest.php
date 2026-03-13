<?php

use SafeAccessInline\Accessors\ArrayAccessor;
use SafeAccessInline\Contracts\SerializerPluginInterface;
use SafeAccessInline\Core\PluginRegistry;
use SafeAccessInline\Exceptions\InvalidFormatException;
use SafeAccessInline\Exceptions\UnsupportedTypeException;
use SafeAccessInline\Traits\HasTransformations;

beforeEach(function () {
    PluginRegistry::reset();
});

describe(HasTransformations::class, function () {

    it('toJson with flags', function () {
        $accessor = ArrayAccessor::from(['name' => 'Ana']);
        $json = $accessor->toJson(JSON_PRETTY_PRINT);
        expect($json)->toContain("\n");
        expect(json_decode($json, true))->toBe(['name' => 'Ana']);
    });

    it('toObject returns stdClass', function () {
        $accessor = ArrayAccessor::from(['name' => 'Ana', 'age' => 30]);
        $obj = $accessor->toObject();
        expect($obj)->toBeObject();
        expect($obj->name)->toBe('Ana');
        expect($obj->age)->toBe(30);
    });

    it('toXml throws InvalidFormatException for invalid root element', function () {
        $accessor = ArrayAccessor::from(['a' => 1]);
        expect(fn () => $accessor->toXml('123invalid'))->toThrow(InvalidFormatException::class);
    });

    it('toXml uses registered serializer plugin', function () {
        $serializer = new class () implements SerializerPluginInterface {
            public function serialize(array $data): string
            {
                return '<custom>' . json_encode($data) . '</custom>';
            }
        };
        PluginRegistry::registerSerializer('xml', $serializer);

        $accessor = ArrayAccessor::from(['a' => 1]);
        expect($accessor->toXml())->toBe('<custom>{"a":1}</custom>');
    });

    it('toXml falls back to native SimpleXMLElement', function () {
        $accessor = ArrayAccessor::from(['name' => 'Ana', 'age' => '30']);
        $xml = $accessor->toXml();
        expect($xml)->toContain('<name>Ana</name>');
        expect($xml)->toContain('<age>30</age>');
    });

    it('toXml handles nested arrays', function () {
        $accessor = ArrayAccessor::from(['items' => [['title' => 'A'], ['title' => 'B']]]);
        $xml = $accessor->toXml();
        expect($xml)->toContain('<items>');
    });

    it('toXml handles numeric keys', function () {
        $accessor = ArrayAccessor::from([['a' => 1], ['a' => 2]]);
        $xml = $accessor->toXml();
        expect($xml)->toContain('item_0');
    });

    it('toYaml uses registered serializer plugin', function () {
        $serializer = new class () implements SerializerPluginInterface {
            public function serialize(array $data): string
            {
                return 'yaml:' . json_encode($data);
            }
        };
        PluginRegistry::registerSerializer('yaml', $serializer);

        $accessor = ArrayAccessor::from(['a' => 1]);
        expect($accessor->toYaml())->toBe('yaml:{"a":1}');
    });

    it('toYaml uses symfony/yaml when no serializer and no native yaml', function () {
        $accessor = new class (['a' => 1]) extends ArrayAccessor {
            protected function hasNativeYamlEmit(): bool
            {
                return false;
            }
        };
        $yaml = $accessor->toYaml();
        expect($yaml)->toContain('a: 1');
    });

    it('toYaml falls back to native yaml_emit when ext-yaml is available', function () {
        if (!function_exists('yaml_emit')) {
            $this->markTestSkipped('ext-yaml is not installed');
        }
        $accessor = ArrayAccessor::from(['name' => 'Ana', 'age' => 30]);
        $yaml = $accessor->toYaml();
        expect($yaml)->toContain('name: Ana');
        expect($yaml)->toContain('age: 30');
    });

    it('transform delegates to registered serializer', function () {
        $serializer = new class () implements SerializerPluginInterface {
            public function serialize(array $data): string
            {
                return 'custom:' . json_encode($data);
            }
        };
        PluginRegistry::registerSerializer('custom', $serializer);

        $accessor = ArrayAccessor::from(['a' => 1]);
        expect($accessor->transform('custom'))->toBe('custom:{"a":1}');
    });

    it('transform throws UnsupportedTypeException for unregistered format', function () {
        $accessor = ArrayAccessor::from(['a' => 1]);
        expect(fn () => $accessor->transform('nonexistent'))->toThrow(UnsupportedTypeException::class);
    });

    it('toXml handles null values', function () {
        $accessor = ArrayAccessor::from(['key' => null]);
        $xml = $accessor->toXml();
        expect($xml)->toContain('key');
    });

    it('toToml uses registered serializer plugin', function () {
        $serializer = new class () implements SerializerPluginInterface {
            public function serialize(array $data): string
            {
                return 'toml:' . json_encode($data);
            }
        };
        PluginRegistry::registerSerializer('toml', $serializer);

        $accessor = ArrayAccessor::from(['a' => 1]);
        expect($accessor->toToml())->toBe('toml:{"a":1}');
    });

    it('toToml uses default devium/toml when no serializer registered', function () {
        $accessor = ArrayAccessor::from(['name' => 'Ana', 'count' => 5]);
        $toml = $accessor->toToml();
        expect($toml)->toContain('name');
        expect($toml)->toContain('Ana');
    });

    it('transform falls back to toYaml for yaml format', function () {
        $accessor = ArrayAccessor::from(['a' => 1]);
        $result = $accessor->transform('yaml');
        expect($result)->toContain('a: 1');
    });

    it('transform falls back to toToml for toml format', function () {
        $accessor = ArrayAccessor::from(['a' => 1]);
        $result = $accessor->transform('toml');
        expect($result)->toContain('a');
    });

});
