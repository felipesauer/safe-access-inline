<?php

declare(strict_types=1);

namespace SafeAccessInline\Benchmarks;

use PhpBench\Attributes\BeforeMethods;
use PhpBench\Attributes\Iterations;
use PhpBench\Attributes\Revs;
use SafeAccessInline\Core\Operations\DeepMerger;
use SafeAccessInline\Core\Parsers\DotNotationParser;

/**
 * Tipo: Benchmark
 * Mede throughput em cenários extremos. NÃO falha o CI — relatório apenas.
 * Rodar: composer bench
 * Comparar entre versões: vendor/bin/phpbench run --ref=main
 */
#[BeforeMethods('setUp')]
class AccessBench
{
    /** @var array<string, mixed> */
    private array $flatObject;

    /** @var array<string, mixed> */
    private array $largeArray;

    /** @var array<string, mixed> */
    private array $deepObject;

    /** @var array<string, mixed> */
    private array $mergeBase;

    /** @var array<string, mixed> */
    private array $mergeOverlay;

    private string $deepPath;

    public function setUp(): void
    {
        // Objeto flat com 1000 chaves para baseline
        $this->flatObject = [];
        for ($i = 0; $i < 1000; $i++) {
            $this->flatObject["key{$i}"] = "value{$i}";
        }

        // Array grande com 10.000 itens para wildcard/filtro
        $this->largeArray = ['items' => []];
        for ($i = 0; $i < 10_000; $i++) {
            $this->largeArray['items'][] = [
                'id' => $i,
                'name' => "item-{$i}",
                'price' => $i * 10,
                'active' => $i % 2 === 0,
            ];
        }

        // Objeto com 100 níveis de profundidade
        $inner = ['value' => 'deep'];
        for ($i = 99; $i >= 0; $i--) {
            $inner = ["level{$i}" => $inner];
        }
        $this->deepObject = $inner;

        // Path para o objeto profundo
        $segments = [];
        for ($i = 0; $i < 100; $i++) {
            $segments[] = "level{$i}";
        }
        $segments[] = 'value';
        $this->deepPath = implode('.', $segments);

        // Objetos para deep merge
        $this->mergeBase = [];
        $this->mergeOverlay = [];
        for ($i = 0; $i < 1000; $i++) {
            $this->mergeBase["key{$i}"] = ['nested' => $i];
            $this->mergeOverlay["key{$i}"] = ['nested' => $i * 2, 'extra' => true];
        }
    }

    /** Linha de base — sem wildcards, acesso direto a chave existente */
    #[Revs(1000)]
    #[Iterations(5)]
    public function benchSimpleAccess(): void
    {
        DotNotationParser::get($this->flatObject, 'key500');
    }

    /** Caso mais custoso: percorre N elementos coletando valores */
    #[Revs(10)]
    #[Iterations(5)]
    public function benchWildcardLargeArray(): void
    {
        DotNotationParser::get($this->largeArray, 'items.*.name');
    }

    /** Testa overhead de percorrer path com muitos segmentos */
    #[Revs(100)]
    #[Iterations(5)]
    public function benchDeepPath(): void
    {
        DotNotationParser::get($this->deepObject, $this->deepPath);
    }

    /** Filtro é O(n) — medir custo com array grande */
    #[Revs(10)]
    #[Iterations(5)]
    public function benchFilterLargeArray(): void
    {
        DotNotationParser::get($this->largeArray, 'items[?price>50000].name');
    }

    /** Deep merge é a operação mais cara — deve ter budget separado */
    #[Revs(50)]
    #[Iterations(5)]
    public function benchDeepMerge(): void
    {
        DeepMerger::merge($this->mergeBase, $this->mergeOverlay);
    }
}
