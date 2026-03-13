<?php

use SafeAccessInline\Plugins\DeviumTomlParser;

describe(DeviumTomlParser::class, function () {

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
