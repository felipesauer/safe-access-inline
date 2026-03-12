<?php

use SafeAccessInline\Plugins\NativeYamlParser;
use SafeAccessInline\Exceptions\InvalidFormatException;

describe(NativeYamlParser::class, function () {

    it('throws InvalidFormatException when dependency is not available', function () {
        $parser = new class extends NativeYamlParser {
            protected function isAvailable(): bool
            {
                return false;
            }
        };
        expect(fn () => $parser->parse('key: value'))->toThrow(InvalidFormatException::class);
    });

    it('parses YAML string when ext-yaml is installed', function () {
        if (!function_exists('yaml_parse')) {
            $this->markTestSkipped('ext-yaml is not installed');
        }
        $parser = new NativeYamlParser();
        $result = $parser->parse("name: Ana\nage: 30");
        expect($result)->toBe(['name' => 'Ana', 'age' => 30]);
    });

    it('returns empty array for non-array YAML result', function () {
        if (!function_exists('yaml_parse')) {
            $this->markTestSkipped('ext-yaml is not installed');
        }
        $parser = new NativeYamlParser();
        $result = $parser->parse('just a scalar string');
        expect($result)->toBe([]);
    });

});
