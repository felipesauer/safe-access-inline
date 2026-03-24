<?php

declare(strict_types=1);

use SafeAccessInline\SafeAccess;

describe('YamlAccessor with real libraries', function () {

    beforeEach(function () {
        if (!class_exists(\Symfony\Component\Yaml\Yaml::class)) {
            $this->markTestSkipped('symfony/yaml not installed (run with deps=full to enable)');
        }
    });

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

});
