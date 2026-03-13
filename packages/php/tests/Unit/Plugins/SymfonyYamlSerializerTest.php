<?php

use SafeAccessInline\Plugins\SymfonyYamlSerializer;

describe(SymfonyYamlSerializer::class, function () {

    it('serializes flat data to YAML', function () {
        $serializer = new SymfonyYamlSerializer();
        $result = $serializer->serialize(['name' => 'Ana']);
        expect($result)->toContain('name: Ana');
    });

    it('roundtrips with SymfonyYamlParser', function () {
        $serializer = new SymfonyYamlSerializer();
        $parser = new \SafeAccessInline\Plugins\SymfonyYamlParser();
        $data = ['name' => 'Ana', 'age' => 30];
        $yaml = $serializer->serialize($data);
        $parsed = $parser->parse($yaml);
        expect($parsed)->toBe($data);
    });

    it('accepts custom inline and indent parameters', function () {
        $serializer = new SymfonyYamlSerializer(2, 4);
        $result = $serializer->serialize(['db' => ['host' => 'localhost']]);
        expect($result)->toContain('host: localhost');
    });

});
