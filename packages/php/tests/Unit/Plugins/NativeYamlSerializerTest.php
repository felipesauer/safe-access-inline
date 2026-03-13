<?php

use SafeAccessInline\Exceptions\InvalidFormatException;
use SafeAccessInline\Plugins\NativeYamlSerializer;

describe(NativeYamlSerializer::class, function () {

    it('throws InvalidFormatException when ext-yaml is not available', function () {
        $serializer = new class () extends NativeYamlSerializer {
            protected function isAvailable(): bool
            {
                return false;
            }
        };
        expect(fn () => $serializer->serialize(['key' => 'value']))->toThrow(InvalidFormatException::class);
    });

    it('serializes data when ext-yaml is installed', function () {
        if (!function_exists('yaml_emit')) {
            $this->markTestSkipped('ext-yaml is not installed');
        }
        $serializer = new NativeYamlSerializer();
        $result = $serializer->serialize(['name' => 'Ana', 'age' => 30]);
        expect($result)->toContain('name');
        expect($result)->toContain('Ana');
    });

    it('roundtrips with NativeYamlParser', function () {
        if (!function_exists('yaml_emit') || !function_exists('yaml_parse')) {
            $this->markTestSkipped('ext-yaml is not installed');
        }
        $serializer = new NativeYamlSerializer();
        $parser = new \SafeAccessInline\Plugins\NativeYamlParser();
        $data = ['name' => 'Ana', 'age' => 30];
        $yaml = $serializer->serialize($data);
        $parsed = $parser->parse($yaml);
        expect($parsed)->toBe($data);
    });

});
