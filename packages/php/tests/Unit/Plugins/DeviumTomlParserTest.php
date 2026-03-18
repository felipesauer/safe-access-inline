<?php

use SafeAccessInline\Exceptions\InvalidFormatException;
use SafeAccessInline\Plugins\DeviumTomlParser;

describe(DeviumTomlParser::class, function () {

    it('throws InvalidFormatException when devium/toml is not available', function () {
        $parser = new class () extends DeviumTomlParser {
            protected function isAvailable(): bool
            {
                return false;
            }
        };
        expect(fn () => $parser->parse('key = "value"'))->toThrow(InvalidFormatException::class, 'devium/toml is not installed');
    });

    beforeEach(function () {
        if (!class_exists(\Devium\Toml\Toml::class)) {
            $this->markTestSkipped('devium/toml not installed (run with deps=full to enable)');
        }
    });

    it('parses flat TOML key-value pairs', function () {
        $parser = new DeviumTomlParser();
        $result = $parser->parse('key = "value"');
        expect($result)->toBe(['key' => 'value']);
    });

    it('parses TOML with sections', function () {
        $parser = new DeviumTomlParser();
        $result = $parser->parse("[server]\nhost = \"localhost\"");
        expect($result)->toHaveKey('server');
        expect($result['server']['host'])->toBe('localhost');
    });

});
