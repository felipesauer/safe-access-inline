<?php

use SafeAccessInline\Plugins\DeviumTomlParser;

describe(DeviumTomlParser::class, function () {

    beforeEach(function () {
        if (!class_exists(\Devium\Toml\Toml::class)) {
            test()->skip('devium/toml not installed (run with deps=full to enable)');
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
