<?php

use SafeAccessInline\Core\PluginRegistry;
use SafeAccessInline\Plugins\SymfonyYamlParser;
use SafeAccessInline\Plugins\SymfonyYamlSerializer;
use SafeAccessInline\SafeAccess;

beforeEach(function () {
    PluginRegistry::reset();

    if (!class_exists(\Symfony\Component\Yaml\Yaml::class)) {
        test()->markTestSkipped('symfony/yaml not installed');
    }

    PluginRegistry::registerParser('yaml', new SymfonyYamlParser());
    PluginRegistry::registerSerializer('yaml', new SymfonyYamlSerializer());
});

describe('YamlAccessor with real symfony/yaml', function () {

    it('parses real YAML with nested structures', function () {
        $yaml = <<<YAML
        database:
          host: localhost
          port: 3306
          credentials:
            user: admin
            password: secret
        YAML;

        $accessor = SafeAccess::fromYaml($yaml);

        expect($accessor->get('database.host'))->toBe('localhost');
        expect($accessor->get('database.port'))->toBe(3306);
        expect($accessor->get('database.credentials.user'))->toBe('admin');
        expect($accessor->get('database.credentials.password'))->toBe('secret');
    });

    it('parses YAML with arrays', function () {
        $yaml = <<<YAML
        items:
          - first
          - second
          - third
        YAML;

        $accessor = SafeAccess::fromYaml($yaml);
        expect($accessor->get('items'))->toBe(['first', 'second', 'third']);
    });

    it('round-trips through toYaml', function () {
        PluginRegistry::registerParser('yaml', new SymfonyYamlParser());
        PluginRegistry::registerSerializer('yaml', new SymfonyYamlSerializer());

        $accessor = SafeAccess::fromArray(['name' => 'test', 'value' => 42]);
        $yaml = $accessor->toYaml();

        $reparsed = SafeAccess::fromYaml($yaml);

        expect($reparsed->get('name'))->toBe('test');
        expect($reparsed->get('value'))->toBe(42);
    });

    it('toYaml returns valid YAML string', function () {
        $yaml = "name: Ana\nage: 30";
        $accessor = SafeAccess::fromYaml($yaml);
        $output = $accessor->toYaml();
        expect($output)->toContain('name:');
        expect($output)->toContain('Ana');
        expect($output)->toContain('age:');
    });
});
