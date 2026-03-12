<?php

use SafeAccessInline\Plugins\SymfonyYamlParser;
use SafeAccessInline\Exceptions\InvalidFormatException;

describe(SymfonyYamlParser::class, function () {

    it('throws InvalidFormatException when dependency is not available', function () {
        $parser = new class extends SymfonyYamlParser {
            protected function isAvailable(): bool
            {
                return false;
            }
        };
        expect(fn () => $parser->parse('key: value'))->toThrow(InvalidFormatException::class);
    });

    it('parses YAML when symfony/yaml is installed', function () {
        if (!class_exists(\Symfony\Component\Yaml\Yaml::class)) {
            $this->markTestSkipped('symfony/yaml is not installed');
        }
        $parser = new SymfonyYamlParser();
        $result = $parser->parse("name: Ana\nage: 30");
        expect($result)->toBe(['name' => 'Ana', 'age' => 30]);
    });

    it('returns empty array for non-array YAML result', function () {
        if (!class_exists(\Symfony\Component\Yaml\Yaml::class)) {
            $this->markTestSkipped('symfony/yaml is not installed');
        }
        $parser = new SymfonyYamlParser();
        $result = $parser->parse('just a scalar string');
        expect($result)->toBe([]);
    });

});
