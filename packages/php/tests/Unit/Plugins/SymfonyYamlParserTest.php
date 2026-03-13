<?php

use SafeAccessInline\Plugins\SymfonyYamlParser;

describe(SymfonyYamlParser::class, function () {

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
