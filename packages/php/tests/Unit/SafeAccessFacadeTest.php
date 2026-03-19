<?php

use SafeAccessInline\Accessors\ArrayAccessor;
use SafeAccessInline\Accessors\CsvAccessor;
use SafeAccessInline\Accessors\EnvAccessor;
use SafeAccessInline\Accessors\IniAccessor;
use SafeAccessInline\Accessors\JsonAccessor;
use SafeAccessInline\Accessors\ObjectAccessor;
use SafeAccessInline\Accessors\XmlAccessor;
use SafeAccessInline\Contracts\HttpClientInterface;
use SafeAccessInline\Core\Io\IoLoader;
use SafeAccessInline\Enums\AccessorFormat;
use SafeAccessInline\Exceptions\InvalidFormatException;
use SafeAccessInline\Exceptions\SecurityException;
use SafeAccessInline\SafeAccess;
use SafeAccessInline\Security\Guards\SecurityPolicy;

describe(SafeAccess::class, function () {

    it('fromArray', function () {
        $accessor = SafeAccess::fromArray(['name' => 'Ana']);
        expect($accessor)->toBeInstanceOf(ArrayAccessor::class);
        expect($accessor->get('name'))->toBe('Ana');
    });

    it('fromObject', function () {
        $accessor = SafeAccess::fromObject((object) ['name' => 'Ana']);
        expect($accessor)->toBeInstanceOf(ObjectAccessor::class);
        expect($accessor->get('name'))->toBe('Ana');
    });

    it('fromJson', function () {
        $accessor = SafeAccess::fromJson('{"name": "Ana"}');
        expect($accessor)->toBeInstanceOf(JsonAccessor::class);
        expect($accessor->get('name'))->toBe('Ana');
    });

    it('fromXml', function () {
        $accessor = SafeAccess::fromXml('<root><name>Ana</name></root>');
        expect($accessor)->toBeInstanceOf(XmlAccessor::class);
        expect($accessor->get('name'))->toBe('Ana');
    });

    it('fromIni', function () {
        $accessor = SafeAccess::fromIni("[section]\nkey=value");
        expect($accessor)->toBeInstanceOf(IniAccessor::class);
        expect($accessor->get('section.key'))->toBe('value');
    });

    it('fromCsv', function () {
        $accessor = SafeAccess::fromCsv("name,age\nAna,30");
        expect($accessor)->toBeInstanceOf(CsvAccessor::class);
        expect($accessor->get('0.name'))->toBe('Ana');
    });

    it('fromEnv', function () {
        $accessor = SafeAccess::fromEnv("KEY=value");
        expect($accessor)->toBeInstanceOf(EnvAccessor::class);
        expect($accessor->get('KEY'))->toBe('value');
    });

    it('detect — array', function () {
        $accessor = SafeAccess::detect(['a' => 1]);
        expect($accessor)->toBeInstanceOf(ArrayAccessor::class);
    });

    it('detect — JSON string', function () {
        $accessor = SafeAccess::detect('{"key": "value"}');
        expect($accessor)->toBeInstanceOf(JsonAccessor::class);
    });

    it('detect — object', function () {
        $accessor = SafeAccess::detect((object) ['a' => 1]);
        expect($accessor)->toBeInstanceOf(ObjectAccessor::class);
    });

    it('extend and custom', function () {
        SafeAccess::extend('test_format', ArrayAccessor::class);
        $accessor = SafeAccess::custom('test_format', ['a' => 1]);
        expect($accessor)->toBeInstanceOf(ArrayAccessor::class);
        expect($accessor->get('a'))->toBe(1);
    });

    it('custom — unregistered throws', function () {
        SafeAccess::custom('nonexistent', []);
    })->throws(\RuntimeException::class);

    // ── from() ──────────────────────────────────────────

    it('from() auto-detects array', function () {
        $accessor = SafeAccess::from(['name' => 'Ana']);
        expect($accessor)->toBeInstanceOf(ArrayAccessor::class);
        expect($accessor->get('name'))->toBe('Ana');
    });

    it('from() auto-detects object', function () {
        $accessor = SafeAccess::from((object) ['name' => 'Ana']);
        expect($accessor)->toBeInstanceOf(ObjectAccessor::class);
        expect($accessor->get('name'))->toBe('Ana');
    });

    it('from() auto-detects JSON string', function () {
        $accessor = SafeAccess::from('{"name": "Ana"}');
        expect($accessor)->toBeInstanceOf(JsonAccessor::class);
        expect($accessor->get('name'))->toBe('Ana');
    });

    it('from() with format "array"', function () {
        $accessor = SafeAccess::from(['name' => 'Ana'], 'array');
        expect($accessor)->toBeInstanceOf(ArrayAccessor::class);
        expect($accessor->get('name'))->toBe('Ana');
    });

    it('from() with format "object"', function () {
        $accessor = SafeAccess::from((object) ['name' => 'Ana'], 'object');
        expect($accessor)->toBeInstanceOf(ObjectAccessor::class);
        expect($accessor->get('name'))->toBe('Ana');
    });

    it('from() with format "json"', function () {
        $accessor = SafeAccess::from('{"name": "Ana"}', 'json');
        expect($accessor)->toBeInstanceOf(JsonAccessor::class);
        expect($accessor->get('name'))->toBe('Ana');
    });

    it('from() with format "xml"', function () {
        $accessor = SafeAccess::from('<root><name>Ana</name></root>', 'xml');
        expect($accessor)->toBeInstanceOf(XmlAccessor::class);
        expect($accessor->get('name'))->toBe('Ana');
    });

    it('from() with format "ini"', function () {
        $accessor = SafeAccess::from("[section]\nkey=value", 'ini');
        expect($accessor)->toBeInstanceOf(IniAccessor::class);
        expect($accessor->get('section.key'))->toBe('value');
    });

    it('from() with format "csv"', function () {
        $accessor = SafeAccess::from("name,age\nAna,30", 'csv');
        expect($accessor)->toBeInstanceOf(CsvAccessor::class);
        expect($accessor->get('0.name'))->toBe('Ana');
    });

    it('from() with format "env"', function () {
        $accessor = SafeAccess::from("KEY=value", 'env');
        expect($accessor)->toBeInstanceOf(EnvAccessor::class);
        expect($accessor->get('KEY'))->toBe('value');
    });

    it('from() with custom format registered via extend()', function () {
        SafeAccess::extend('from_test_format', ArrayAccessor::class);
        $accessor = SafeAccess::from(['a' => 1], 'from_test_format');
        expect($accessor)->toBeInstanceOf(ArrayAccessor::class);
        expect($accessor->get('a'))->toBe(1);
    });

    it('from() throws InvalidFormatException for unknown format', function () {
        SafeAccess::from('data', 'unknown_xyz');
    })->throws(InvalidFormatException::class, "Unknown format 'unknown_xyz'");

    // ── from() with AccessorFormat enum ─────────────

    it('from() with AccessorFormat enum', function () {
        $accessor = SafeAccess::from(['name' => 'Ana'], AccessorFormat::Array);
        expect($accessor)->toBeInstanceOf(ArrayAccessor::class);
        expect($accessor->get('name'))->toBe('Ana');
    });

    // ── fromFile with extensionless path ────────────

    it('fromFile auto-detects format for extensionless file', function () {
        $tmp = tempnam(sys_get_temp_dir(), 'sa-ext-');
        file_put_contents($tmp, '{"key":"value"}');
        try {
            $accessor = SafeAccess::fromFile($tmp, null, [], true);
            expect($accessor)->toBeInstanceOf(JsonAccessor::class);
            expect($accessor->get('key'))->toBe('value');
        } finally {
            unlink($tmp);
        }
    });

    // ── setGlobalPolicy / clearGlobalPolicy ─────────

    it('setGlobalPolicy and clearGlobalPolicy delegate to SecurityPolicy', function () {
        $policy = new SecurityPolicy(maxDepth: 99);
        SafeAccess::setGlobalPolicy($policy);
        expect(SecurityPolicy::getGlobal())->toBe($policy);
        SafeAccess::clearGlobalPolicy();
        expect(SecurityPolicy::getGlobal())->toBeNull();
    });

    // ── withPolicy enforcement ──────────────────────

    it('withPolicy enforces maxPayloadBytes', function () {
        $bigString = str_repeat('x', 2000);
        $policy = new SecurityPolicy(maxPayloadBytes: 100);
        SafeAccess::withPolicy($bigString, $policy);
    })->throws(SecurityException::class, 'Payload size');

    it('withPolicy enforces maxKeys', function () {
        $data = [];
        for ($i = 0; $i < 50; $i++) {
            $data["key{$i}"] = $i;
        }
        $policy = new SecurityPolicy(maxKeys: 10);
        SafeAccess::withPolicy($data, $policy);
    })->throws(SecurityException::class, 'exceeding maximum');

    it('withPolicy enforces maxDepth', function () {
        $data = ['a' => ['b' => ['c' => ['d' => ['e' => 'deep']]]]];
        $policy = new SecurityPolicy(maxDepth: 2);
        SafeAccess::withPolicy($data, $policy);
    })->throws(SecurityException::class, 'structural depth');

    it('withPolicy applies maskPatterns', function () {
        $data = ['password' => 'secret123', 'name' => 'Ana'];
        $policy = new SecurityPolicy(maskPatterns: ['password']);
        $accessor = SafeAccess::withPolicy($data, $policy);
        expect($accessor->get('password'))->toBe('[REDACTED]');
        expect($accessor->get('name'))->toBe('Ana');
    });

    it('withPolicy passes through when all limits are satisfied', function () {
        $data = ['key' => 'value'];
        $policy = SecurityPolicy::permissive();
        $accessor = SafeAccess::withPolicy($data, $policy);
        expect($accessor->get('key'))->toBe('value');
    });

    // ── resetAll ────────────────────────────────────

    it('resetAll clears all global state', function () {
        $policy = new SecurityPolicy(maxDepth: 99);
        SafeAccess::setGlobalPolicy($policy);
        SafeAccess::resetAll();
        expect(SecurityPolicy::getGlobal())->toBeNull();
    });

    // ── clearGlobalPolicy ──────────────────────────

    it('clearGlobalPolicy removes global policy', function () {
        $policy = new SecurityPolicy(maxDepth: 50);
        SafeAccess::setGlobalPolicy($policy);
        expect(SecurityPolicy::getGlobal())->not->toBeNull();
        SafeAccess::clearGlobalPolicy();
        expect(SecurityPolicy::getGlobal())->toBeNull();
    });

    // ── layer with empty sources ────────────────────

    it('layer with empty array returns empty accessor', function () {
        $accessor = SafeAccess::layer([]);
        expect($accessor->toArray())->toBe([]);
    });

    // ── from() with unknown format ──────────────────

    it('from() throws for unknown unregistered format', function () {
        expect(fn () => SafeAccess::from('data', 'protobuf'))
            ->toThrow(\SafeAccessInline\Exceptions\InvalidFormatException::class, "Unknown format 'protobuf'");
    });

    // ── fromUrl with mock HTTP client ───────────────

    it('fromUrl returns accessor from mock HTTP response', function () {
        $mock = new class () implements HttpClientInterface {
            public function fetch(string $url, array $curlOptions): string
            {
                return '{"status":"ok"}';
            }
        };
        IoLoader::setHttpClient($mock);

        try {
            $accessor = SafeAccess::fromUrl('https://example.com/data.json');
            expect($accessor)->toBeInstanceOf(JsonAccessor::class);
            expect($accessor->get('status'))->toBe('ok');
        } finally {
            IoLoader::resetHttpClient();
        }
    });

    it('fromUrl auto-detects format from URL extension', function () {
        $mock = new class () implements HttpClientInterface {
            public function fetch(string $url, array $curlOptions): string
            {
                return '{"auto":"detected"}';
            }
        };
        IoLoader::setHttpClient($mock);

        try {
            $accessor = SafeAccess::fromUrl('https://example.com/config.json');
            expect($accessor)->toBeInstanceOf(JsonAccessor::class);
            expect($accessor->get('auto'))->toBe('detected');
        } finally {
            IoLoader::resetHttpClient();
        }
    });

    it('fromUrl falls back to type detection when no extension', function () {
        $mock = new class () implements HttpClientInterface {
            public function fetch(string $url, array $curlOptions): string
            {
                return '{"fallback":"yes"}';
            }
        };
        IoLoader::setHttpClient($mock);

        try {
            $accessor = SafeAccess::fromUrl('https://example.com/api/data');
            expect($accessor->get('fallback'))->toBe('yes');
        } finally {
            IoLoader::resetHttpClient();
        }
    });

    it('fromUrlWithPolicy fetches and applies policy', function () {
        $mock = new class () implements HttpClientInterface {
            public function fetch(string $url, array $curlOptions): string
            {
                return '{"secret":"value","name":"test"}';
            }
        };
        IoLoader::setHttpClient($mock);

        try {
            $policy = new SecurityPolicy(url: ['allowedHosts' => ['example.com']]);
            $accessor = SafeAccess::fromUrlWithPolicy('https://example.com/data.json', $policy);
            expect($accessor->get('name'))->toBe('test');
        } finally {
            IoLoader::resetHttpClient();
        }
    });

    // ── LOGIC-02 regression: extend() cap & resetAll ──

    it('extend — throws OverflowException when cap exceeded', function () {
        SafeAccess::resetAll();
        for ($i = 0; $i < 50; $i++) {
            SafeAccess::extend("cap_test_{$i}", ArrayAccessor::class);
        }
        expect(fn () => SafeAccess::extend('cap_overflow', ArrayAccessor::class))
            ->toThrow(\OverflowException::class);
        SafeAccess::resetAll();
    });

    it('resetAll — clears custom accessors', function () {
        SafeAccess::extend('reset_test', ArrayAccessor::class);
        SafeAccess::resetAll();
        expect(fn () => SafeAccess::custom('reset_test', []))
            ->toThrow(\RuntimeException::class);
    });
});
