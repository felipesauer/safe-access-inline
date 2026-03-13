<?php

use SafeAccessInline\Plugins\DeviumTomlSerializer;

describe(DeviumTomlSerializer::class, function () {

    it('serializes flat data to TOML', function () {
        $serializer = new DeviumTomlSerializer();
        $result = $serializer->serialize(['name' => 'Ana', 'count' => 5]);
        expect($result)->toContain('name');
        expect($result)->toContain('Ana');
        expect($result)->toContain('count = 5');
    });

    it('roundtrips with DeviumTomlParser', function () {
        $serializer = new DeviumTomlSerializer();
        $parser = new \SafeAccessInline\Plugins\DeviumTomlParser();
        $data = ['name' => 'Ana', 'count' => 5];
        $toml = $serializer->serialize($data);
        $parsed = $parser->parse($toml);
        expect($parsed)->toBe($data);
    });

});
