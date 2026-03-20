<?php

declare(strict_types=1);

/**
 * Tipo: Snapshot
 * Congela saídas de queries complexas. Atualize snapshots com:
 *   vendor/bin/pest tests/SnapshotTest.php --update-snapshots
 * Qualquer mudança não intencional no output quebra este teste.
 * Rodar: composer test:snapshot
 */

use SafeAccessInline\Core\Operations\DeepMerger;
use SafeAccessInline\SafeAccess;

$deepData = [
    'a' => [
        'name' => 'a1',
        'b' => [
            'name' => 'b1',
            'c' => [
                'name' => 'c1',
                'd' => [
                    'name' => 'd1',
                    'value' => 42,
                ],
            ],
        ],
    ],
    'items' => [
        ['name' => 'item1', 'sub' => ['name' => 'sub1', 'score' => 10]],
        ['name' => 'item2', 'sub' => ['name' => 'sub2', 'score' => 30]],
    ],
];

describe(SafeAccess::class . ' — snapshot', function () use ($deepData): void {

    $accessor = SafeAccess::fromArray($deepData);

    // Recursive descent coleta TODAS as ocorrências de uma chave em qualquer profundidade
    it('recursive wildcard (..) on 4-level nested object', function () use ($accessor): void {
        expect($accessor->get('..name'))->toMatchSnapshot();
    });

    // Filtro + wildcard combinados testam a interação entre duas estratégias de resolução
    it('filter combined with wildcard: items[?sub.score>15].sub.name', function () use ($accessor): void {
        expect($accessor->get('items[?sub.score>15].sub.name'))->toMatchSnapshot();
    });

    // Deep merge com chaves conflitantes é a operação mais complexa — output deve ser determinístico
    it('deep merge of two objects with conflicting keys', function (): void {
        $base = ['a' => 1, 'b' => ['x' => 10, 'y' => 20], 'c' => [1, 2]];
        $overlay = ['b' => ['y' => 99, 'z' => 30], 'c' => [3], 'd' => 'new'];
        $result = DeepMerger::merge($base, $overlay);
        expect($result)->toMatchSnapshot();
    });

    // Wildcard em estruturas aninhadas de array deve retornar a estrutura interna completa
    it('array wildcard returning nested structure', function () use ($accessor): void {
        expect($accessor->get('items.*.sub'))->toMatchSnapshot();
    });
});
