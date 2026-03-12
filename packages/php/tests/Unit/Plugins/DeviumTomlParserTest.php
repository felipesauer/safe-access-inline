<?php

use SafeAccessInline\Plugins\DeviumTomlParser;
use SafeAccessInline\Exceptions\InvalidFormatException;

describe(DeviumTomlParser::class, function () {

    it('throws InvalidFormatException when dependency is not available', function () {
        $parser = new class extends DeviumTomlParser {
            protected function isAvailable(): bool
            {
                return false;
            }
        };
        expect(fn () => $parser->parse('key = "value"'))->toThrow(InvalidFormatException::class);
    });

    it('parses TOML when dependency is available', function () {
        if (!class_exists(\Devium\Toml\Toml::class)) {
            $this->markTestSkipped('devium/toml is not installed');
        }
        $parser = new DeviumTomlParser();
        $result = $parser->parse("[server]\nhost = \"localhost\"");
        expect($result)->toHaveKey('server');
    });

});
