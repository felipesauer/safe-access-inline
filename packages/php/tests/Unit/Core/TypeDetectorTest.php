<?php

use SafeAccessInline\Accessors\ArrayAccessor;
use SafeAccessInline\Accessors\EnvAccessor;
use SafeAccessInline\Accessors\IniAccessor;
use SafeAccessInline\Accessors\JsonAccessor;
use SafeAccessInline\Accessors\ObjectAccessor;
use SafeAccessInline\Accessors\XmlAccessor;
use SafeAccessInline\Core\TypeDetector;
use SafeAccessInline\Core\PluginRegistry;
use SafeAccessInline\Contracts\ParserPluginInterface;
use SafeAccessInline\Exceptions\UnsupportedTypeException;

describe(TypeDetector::class, function () {

    it('detects array', function () {
        $accessor = TypeDetector::resolve(['a' => 1]);
        expect($accessor)->toBeInstanceOf(ArrayAccessor::class);
    });

    it('detects SimpleXMLElement', function () {
        $xml = new SimpleXMLElement('<root><a>1</a></root>');
        $accessor = TypeDetector::resolve($xml);
        expect($accessor)->toBeInstanceOf(XmlAccessor::class);
    });

    it('detects object', function () {
        $accessor = TypeDetector::resolve((object) ['a' => 1]);
        expect($accessor)->toBeInstanceOf(ObjectAccessor::class);
    });

    it('detects JSON string', function () {
        $accessor = TypeDetector::resolve('{"key": "value"}');
        expect($accessor)->toBeInstanceOf(JsonAccessor::class);
    });

    it('detects JSON array string', function () {
        $accessor = TypeDetector::resolve('[1, 2, 3]');
        expect($accessor)->toBeInstanceOf(JsonAccessor::class);
    });

    it('detects XML string', function () {
        $accessor = TypeDetector::resolve('<root><item>value</item></root>');
        expect($accessor)->toBeInstanceOf(XmlAccessor::class);
    });

    it('detects INI string', function () {
        $accessor = TypeDetector::resolve("[section]\nkey=value");
        expect($accessor)->toBeInstanceOf(IniAccessor::class);
    });

    it('detects ENV string', function () {
        $accessor = TypeDetector::resolve("APP_KEY=secret\nDEBUG=true");
        expect($accessor)->toBeInstanceOf(EnvAccessor::class);
    });

    it('throws for unsupported type', function () {
        TypeDetector::resolve(42);
    })->throws(UnsupportedTypeException::class);

    it('detects YAML string when parser plugin registered', function () {
        $parser = new class implements ParserPluginInterface {
            public function parse(string $raw): array
            {
                return ['key' => 'value'];
            }
        };
        PluginRegistry::registerParser('yaml', $parser);

        $accessor = TypeDetector::resolve("database:\n  host: localhost");
        expect($accessor)->toBeInstanceOf(\SafeAccessInline\Accessors\YamlAccessor::class);

        PluginRegistry::reset();
    });

    it('falls through invalid JSON starting with {', function () {
        // Invalid JSON starting with { should not be detected as JSON
        $accessor = TypeDetector::resolve('{not json at all');
        // This will be detected as something else or throw
        expect($accessor)->not->toBeNull();
    })->throws(UnsupportedTypeException::class);

});
