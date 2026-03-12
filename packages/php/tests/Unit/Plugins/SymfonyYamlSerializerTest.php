<?php

use SafeAccessInline\Plugins\SymfonyYamlSerializer;
use SafeAccessInline\Exceptions\InvalidFormatException;

describe(SymfonyYamlSerializer::class, function () {

    it('throws InvalidFormatException when dependency is not available', function () {
        $serializer = new class extends SymfonyYamlSerializer {
            protected function isAvailable(): bool
            {
                return false;
            }
        };
        expect(fn () => $serializer->serialize(['key' => 'value']))->toThrow(InvalidFormatException::class);
    });

    it('serializes data when symfony/yaml is installed', function () {
        if (!class_exists(\Symfony\Component\Yaml\Yaml::class)) {
            $this->markTestSkipped('symfony/yaml is not installed');
        }
        $serializer = new SymfonyYamlSerializer();
        $result = $serializer->serialize(['name' => 'Ana']);
        expect($result)->toContain('name: Ana');
    });

    it('accepts custom inline and indent parameters', function () {
        $serializer = new SymfonyYamlSerializer(2, 4);
        expect($serializer)->toBeInstanceOf(SymfonyYamlSerializer::class);
    });

});
