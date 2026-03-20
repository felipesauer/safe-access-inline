<?php

declare(strict_types=1);

use SafeAccessInline\Exceptions\InvalidFormatException;
use SafeAccessInline\Plugins\SymfonyYamlParser;

describe(SymfonyYamlParser::class, function () {

    it('throws InvalidFormatException when symfony/yaml is not available', function () {
        $parser = new class () extends SymfonyYamlParser {
            protected function isAvailable(): bool
            {
                return false;
            }
        };
        expect(fn () => $parser->parse('name: Ana'))->toThrow(InvalidFormatException::class, 'symfony/yaml is not installed');
    });

    beforeEach(function () {
        if (!class_exists(\Symfony\Component\Yaml\Yaml::class)) {
            $this->markTestSkipped('symfony/yaml not installed (run with deps=full to enable)');
        }
    });

    it('parses YAML key-value pairs', function () {
        $parser = new SymfonyYamlParser();
        $result = $parser->parse("name: Ana\nage: 30");
        expect($result)->toBe(['name' => 'Ana', 'age' => 30]);
    });

    it('parses YAML with nested structures', function () {
        $parser = new SymfonyYamlParser();
        $result = $parser->parse("db:\n  host: localhost\n  port: 3306");
        expect($result)->toBe(['db' => ['host' => 'localhost', 'port' => 3306]]);
    });

    it('returns empty array for non-array YAML result', function () {
        $parser = new SymfonyYamlParser();
        $result = $parser->parse('just a scalar string');
        expect($result)->toBe([]);
    });

});
