<?php

declare(strict_types=1);

/**
 * Tipo: Property-based
 * Gera inputs aleatórios para validar invariantes universais.
 * Diferente dos testes de exemplo, aqui não importa o valor — importa que a
 * PROPRIEDADE seja sempre verdadeira independente do input.
 * Rodar: composer test:property
 * Timeout por propriedade: 30s
 */

use SafeAccessInline\Core\Parsers\DotNotationParser;
use SafeAccessInline\SafeAccess;

describe('Property-based invariants', function (): void {

    /** Nenhum path deve lançar exceção não capturada — segurança acima de tudo */
    it('safety: no path makes the library throw', function (): void {
        $paths = [
            '', 'a', 'a.b.c', '*.x', '..x', '__proto__', 'constructor',
            'a[?x>1].b', '0.1.2', str_repeat('a.', 50) . 'z',
            "key\0null", "key\nnewline", 'a.*.b.*.c',
        ];
        // Gera 100 paths aleatórios adicionais
        for ($i = 0; $i < 100; $i++) {
            $len = random_int(1, 30);
            $path = '';
            for ($j = 0; $j < $len; $j++) {
                $path .= chr(random_int(32, 126));
            }
            $paths[] = $path;
        }

        $data = ['a' => ['b' => ['c' => 1]], 'items' => [['x' => 2]]];

        foreach ($paths as $path) {
            // Assert: nunca lança exceção não capturada
            try {
                DotNotationParser::get($data, $path, null);
            } catch (\Throwable $e) {
                $this->fail("Path '{$path}' threw " . get_class($e) . ': ' . $e->getMessage());
            }
        }

        expect(true)->toBeTrue();
    });

    /** O default é o "escudo" do usuário — deve ser sempre honrado */
    it('default is always returned when path does not exist', function (): void {
        $defaults = [null, 0, '', false, [], 'fallback', 42, 3.14, ['nested' => true]];

        foreach ($defaults as $default) {
            $result = DotNotationParser::get([], '__nonexistent__', $default);
            expect($result)->toBe($default);
        }
    });

    /** get($data, $key) deve ser equivalente a $data[$key] para chaves simples */
    it('idempotence: simple key access matches direct array access', function (): void {
        $keys = ['name', 'age', 'x', 'key_0', 'CamelCase', 'UPPER'];
        $values = ['string', 42, true, false, null, 0, '', 3.14, ['nested']];

        foreach ($keys as $key) {
            foreach ($values as $value) {
                $data = [$key => $value];
                expect(DotNotationParser::get($data, $key))->toBe($value);
            }
        }
    });

    /** Wildcard em array nunca retorna null — no mínimo array vazio */
    it('wildcards always return an array, never null', function (): void {
        // Array vazio
        $result = SafeAccess::fromArray(['items' => []])->get('items.*.price');
        expect(is_array($result))->toBeTrue();

        // Array com elementos
        $items = array_map(
            fn (int $i): array => ['price' => $i * 10],
            range(0, random_int(0, 50)),
        );
        $result = SafeAccess::fromArray(['items' => $items])->get('items.*.price');
        expect(is_array($result))->toBeTrue();
        expect(count($result))->toBe(count($items));
    });
});
