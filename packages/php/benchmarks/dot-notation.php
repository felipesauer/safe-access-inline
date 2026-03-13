#!/usr/bin/env php
<?php

/**
 * Micro-benchmarks for DotNotationParser operations.
 *
 * Usage:  php benchmarks/dot-notation.php
 */

require __DIR__ . '/../vendor/autoload.php';

use SafeAccessInline\Core\DotNotationParser;

// ── Data fixtures ─────────────────────────────────────

$shallow = ['a' => 1, 'b' => 2, 'c' => 3];

$nested = [
    'level1' => [
        'level2' => [
            'level3' => [
                'level4' => ['value' => 'deep'],
            ],
        ],
    ],
];

$array100 = [
    'items' => array_map(
        fn (int $i) => [
            'id'     => $i,
            'name'   => "item-{$i}",
            'active' => $i % 2 === 0,
            'price'  => $i * 10,
        ],
        range(0, 99),
    ),
];

// ── Helpers ───────────────────────────────────────────

function bench(string $label, callable $fn, int $iterations = 10_000): void
{
    // Warm-up
    for ($i = 0; $i < 100; $i++) {
        $fn();
    }

    $start = hrtime(true);
    for ($i = 0; $i < $iterations; $i++) {
        $fn();
    }
    $elapsed = (hrtime(true) - $start) / 1e6; // ms

    $perOp = ($elapsed / $iterations) * 1e3; // µs
    printf("  %-42s %8.2f ms total  %8.2f µs/op  (%s ops)\n", $label, $elapsed, $perOp, number_format($iterations));
}

function section(string $title): void
{
    echo "\n{$title}\n" . str_repeat('─', 72) . "\n";
}

// ── Benchmarks ────────────────────────────────────────

echo "DotNotationParser  ·  PHP " . PHP_VERSION . "\n";
echo str_repeat('═', 72) . "\n";

section('get');
bench('shallow key', fn () => DotNotationParser::get($shallow, 'a'));
bench('4-level deep key', fn () => DotNotationParser::get($nested, 'level1.level2.level3.level4.value'));
bench('wildcard 100 items', fn () => DotNotationParser::get($array100, 'items.*.name'));
bench('filter 100 items (active==true)', fn () => DotNotationParser::get($array100, 'items[?active==true].name'));
bench('filter 100 items (price>500)', fn () => DotNotationParser::get($array100, 'items[?price>500].name'));
bench('missing key (default)', fn () => DotNotationParser::get($shallow, 'x.y.z', 'fallback'));

section('set');
bench('set shallow key', fn () => DotNotationParser::set($shallow, 'd', 4));
bench('set 4-level deep key', fn () => DotNotationParser::set($nested, 'level1.level2.level3.level4.newKey', 'val'));

section('merge');
bench('merge at root', fn () => DotNotationParser::merge($shallow, '', ['d' => 4, 'e' => 5]));
bench('merge at deep path', fn () => DotNotationParser::merge($nested, 'level1.level2', ['extra' => true]));

section('has');
bench('has — existing deep key', fn () => DotNotationParser::has($nested, 'level1.level2.level3.level4.value'));
bench('has — missing key', fn () => DotNotationParser::has($shallow, 'x.y.z'));

echo "\n";
