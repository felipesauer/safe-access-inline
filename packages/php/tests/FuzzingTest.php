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
use SafeAccessInline\Exceptions\InvalidFormatException;
use SafeAccessInline\Exceptions\SecurityException;
use SafeAccessInline\SafeAccess;

describe(SafeAccess::class . ' — fuzzing hostile inputs', function (): void {

    /** DOCTYPE/ENTITY declarations are the XXE entry points — the guard must block them unconditionally */
    it('XML DOCTYPE declarations are blocked with SecurityException', function (): void {
        $docTypeXmls = [
            '<?xml version="1.0"?><!DOCTYPE foo [<!ENTITY xxe SYSTEM "file:///etc/passwd">]><root>&xxe;</root>',
            '<?xml version="1.0"?><!DOCTYPE foo [<!ENTITY xxe SYSTEM "php://filter/convert.base64-encode/resource=/etc/passwd">]><root>&xxe;</root>',
        ];

        foreach ($docTypeXmls as $xml) {
            expect(fn (): mixed => SafeAccess::fromXml($xml))->toThrow(SecurityException::class);
        }
    });

    /** Complex but structurally valid XML must not produce uncontrolled PHP errors */
    it('complex valid XML parses without uncontrolled errors', function (): void {
        $complexXmls = [
            '<root>&amp;&lt;&gt;</root>',
            '<root>' . str_repeat('<a>', 100) . 'x' . str_repeat('</a>', 100) . '</root>',
        ];

        foreach ($complexXmls as $xml) {
            $crashed = false;
            try {
                SafeAccess::fromXml($xml)->get('root', null);
            } catch (SecurityException | InvalidFormatException) {
                // Controlled rejection — acceptable
            } catch (\Error $e) {
                $crashed = true; // Fatal PHP error — never acceptable
            } catch (\Exception) {
                // Third-party parser exception — controlled, acceptable
            }
            expect($crashed)->toBeFalse("Uncontrolled crash parsing XML: {$xml}");
        }
    });

    /** Alias recursivo em YAML pode causar loop infinito no parser */
    it('YAML with recursive aliases does not crash PHP', function (): void {
        $hostileYamls = [
            "a: &anchor\n  b: *anchor",
            "x: &a\n  y: &b\n    z: *a",
            str_repeat("level:\n  ", 200) . "deep: true",
        ];

        foreach ($hostileYamls as $yaml) {
            $crashed = false;
            try {
                SafeAccess::fromYaml($yaml)->get('a', null);
            } catch (SecurityException | InvalidFormatException) {
                // Controlled rejection — acceptable
            } catch (\Error $e) {
                $crashed = true;
            } catch (\Exception) {
                // Parser exception from symfony/yaml or ext-yaml — controlled, acceptable
            }
            expect($crashed)->toBeFalse("Uncontrolled crash parsing YAML");
        }
    })->skip(!class_exists(\Symfony\Component\Yaml\Yaml::class), 'symfony/yaml not installed');

    /** Null bytes em chaves PHP devem retornar o default ou lançar SecurityException — nunca vazar dados */
    it('null bytes in paths return default or throw SecurityException', function (): void {
        $hostilePaths = [
            "\0",
            "key\0injection",
            "__proto__\0",
            "a.\0.b",
            str_repeat("\0", 50),
        ];

        $data = ['a' => ['b' => 1]];

        foreach ($hostilePaths as $path) {
            $crashed = false;
            $result = null;
            try {
                $result = DotNotationParser::get($data, $path, 'sentinel');
            } catch (SecurityException) {
                // Controlled block — acceptable
            } catch (\Error) {
                $crashed = true;
            } catch (\Exception) {
                // Other controlled exception — acceptable
            }
            expect($crashed)->toBeFalse("Uncontrolled crash for null-byte path");
            // If no exception, the path must not have resolved to real data
            if ($result !== null) {
                expect($result)->toBe('sentinel', "Null-byte path leaked real data for: " . addslashes($path));
            }
        }
    });

    /** Delimitadores incomuns são fonte clássica de bugs em parsers CSV — sem crash */
    it('CSV with unusual delimiters does not crash PHP', function (): void {
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
            $crashed = false;
            try {
                SafeAccess::fromCsv($csv)->get('0.a', null);
            } catch (SecurityException | InvalidFormatException) {
                // Controlled rejection — acceptable
            } catch (\Error) {
                $crashed = true;
            } catch (\Exception) {
                // Controlled exception — acceptable
            }
            expect($crashed)->toBeFalse("Uncontrolled crash parsing CSV");
        }
    });

    /** JSON com chaves duplicadas tem comportamento indefinido — deve ser determinístico e não vazar estado */
    it('JSON with duplicate or prototype-polluting keys is handled safely', function (): void {
        $hostileJsons = [
            '{"a": 1, "a": 2}',
            '{"": "empty key"}',
            '{"a": ' . str_repeat('{"b": ', 100) . '1' . str_repeat('}', 100) . '}',
        ];

        foreach ($hostileJsons as $json) {
            $crashed = false;
            try {
                SafeAccess::fromJson($json)->get('a', null);
            } catch (SecurityException | InvalidFormatException | \JsonException) {
                // Controlled rejection — acceptable
            } catch (\Error) {
                $crashed = true;
            } catch (\Exception) {
                // Controlled exception — acceptable
            }
            expect($crashed)->toBeFalse("Uncontrolled crash parsing JSON");
        }
    });

    /**
     * PHP arrays do not have prototype inheritance, so accessing __proto__ as a key is safe for reads.
     * SecurityGuard::assertSafeKey() fires only on WRITE operations (set, merge, patch) to prevent
     * prototype-polluting keys from being written back into storage or serialized to JSON for JS clients.
     * This test verifies reads on data that does NOT contain those keys always return null (no crash).
     */
    it('prototype pollution paths on safe data return null without crashing', function (): void {
        $hostilePaths = [
            '__proto__',
            'constructor',
            '__proto__.polluted',
            'constructor.prototype',
            'toString',
            'valueOf',
            'hasOwnProperty',
        ];

        // Data does NOT contain forbidden keys — result must be the default
        $data = ['a' => 1, 'b' => ['c' => 2]];

        foreach ($hostilePaths as $path) {
            $crashed = false;
            $result = 'sentinel';
            try {
                $result = DotNotationParser::get($data, $path, null);
                // Key does not exist in data — must return null
                expect($result)->toBeNull("Path '{$path}' should return null on data without that key");
            } catch (SecurityException) {
                // Also acceptable: guard can fire for path-segment validation
            } catch (\Error) {
                $crashed = true;
            } catch (\Exception) {
                // Other controlled exception — acceptable
            }
            expect($crashed)->toBeFalse("Uncontrolled crash for prototype pollution path '{$path}'");
        }
    });
});
