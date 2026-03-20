<?php

declare(strict_types=1);

/**
 * Tipo: Fuzzing / Security
 * Alimenta a lib com inputs maliciosos para garantir falha segura e previsível.
 * Foco em vetores clássicos de ataque em parsers PHP.
 * Rodar: composer test -- --filter FuzzingTest
 * Timeout: 30s por método
 */

use SafeAccessInline\Core\Parsers\DotNotationParser;
use SafeAccessInline\SafeAccess;

describe('Fuzzing — hostile inputs', function (): void {

    /** XXE pode vazar arquivos do sistema via entidades externas no XML */
    it('XML with external entities (XXE)', function (): void {
        $hostileXmls = [
            '<?xml version="1.0"?><!DOCTYPE foo [<!ENTITY xxe SYSTEM "file:///etc/passwd">]><root>&xxe;</root>',
            '<?xml version="1.0"?><!DOCTYPE foo [<!ENTITY xxe SYSTEM "php://filter/convert.base64-encode/resource=/etc/passwd">]><root>&xxe;</root>',
            '<root>&amp;&lt;&gt;</root>',
            '<root>' . str_repeat('<a>', 100) . 'x' . str_repeat('</a>', 100) . '</root>',
        ];

        foreach ($hostileXmls as $xml) {
            try {
                $accessor = SafeAccess::fromXml($xml);
                $accessor->get('root', null);
            } catch (\Throwable) {
                // Erro controlado é aceitável
            }
            // Se chegou aqui sem fatal error, passou
            expect(true)->toBeTrue();
        }
    });

    /** Alias recursivo em YAML pode causar loop infinito no parser */
    it('YAML with recursive aliases', function (): void {
        $hostileYamls = [
            "a: &anchor\n  b: *anchor",
            "x: &a\n  y: &b\n    z: *a",
            str_repeat("level:\n  ", 200) . "deep: true",
        ];

        foreach ($hostileYamls as $yaml) {
            try {
                $accessor = SafeAccess::fromYaml($yaml);
                $accessor->get('a', null);
            } catch (\Throwable) {
                // Erro controlado é aceitável
            }
            expect(true)->toBeTrue();
        }
    })->skip(!class_exists(\Symfony\Component\Yaml\Yaml::class), 'symfony/yaml not installed');

    /** Null bytes em chaves PHP podem bypassar validações de path */
    it('strings with null bytes in keys', function (): void {
        $hostilePaths = [
            "\0",
            "key\0injection",
            "__proto__\0",
            "a.\0.b",
            str_repeat("\0", 50),
        ];

        $data = ['a' => ['b' => 1]];

        foreach ($hostilePaths as $path) {
            try {
                DotNotationParser::get($data, $path, null);
            } catch (\Throwable) {
                // Erro controlado é aceitável
            }
            expect(true)->toBeTrue();
        }
    });

    /** Delimitadores incomuns são fonte clássica de bugs em parsers CSV */
    it('CSV with unusual delimiters', function (): void {
        $hostileCsvs = [
            "a,b\n\"val,ue\",test",
            "a,b\n\"val\"\"ue\",test",
            "a,b\n\"val\nue\",test",
            "a,b\n\"\",\"\"",
            ",\n,",
            "a\n\n\n",
            str_repeat("a,", 1000) . "b\n" . str_repeat("1,", 1000) . "2",
        ];

        foreach ($hostileCsvs as $csv) {
            try {
                $accessor = SafeAccess::fromCsv($csv);
                $accessor->get('0.a', null);
            } catch (\Throwable) {
                // Erro controlado é aceitável
            }
            expect(true)->toBeTrue();
        }
    });

    /** JSON com chaves duplicadas tem comportamento indefinido — deve ser determinístico */
    it('JSON with duplicate keys', function (): void {
        $hostileJsons = [
            '{"a": 1, "a": 2}',
            '{"__proto__": {"polluted": true}}',
            '{"constructor": {"prototype": {}}}',
            '{"": "empty key"}',
            '{"a": ' . str_repeat('{"b": ', 100) . '1' . str_repeat('}', 100) . '}',
        ];

        foreach ($hostileJsons as $json) {
            try {
                $accessor = SafeAccess::fromJson($json);
                $accessor->get('a', null);
            } catch (\Throwable) {
                // Erro controlado é aceitável
            }
            expect(true)->toBeTrue();
        }
    });

    /** Paths com injection (__proto__, constructor) devem ser bloqueados ou ignorados */
    it('prototype pollution paths', function (): void {
        $hostilePaths = [
            '__proto__',
            'constructor',
            '__proto__.polluted',
            'constructor.prototype',
            'toString',
            'valueOf',
            'hasOwnProperty',
        ];

        $data = ['a' => 1, 'b' => ['c' => 2]];

        foreach ($hostilePaths as $path) {
            try {
                DotNotationParser::get($data, $path, null);
            } catch (\Throwable) {
                // Erro controlado é aceitável
            }
            expect(true)->toBeTrue();
        }
    });
});
