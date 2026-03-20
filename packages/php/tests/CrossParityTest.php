<?php

declare(strict_types=1);

/**
 * Tipo: Cross-parity
 * Lê os casos de packages/fixtures/cross-parity/cases.json e garante que
 * PHP produz resultados idênticos ao JS para cada um.
 * Se este teste falhar mas o lado JS passar, o bug está na implementação PHP.
 * Se falhar nos DOIS lados, o caso de fixture pode estar errado — revisar cases.json.
 * Rodar: composer test:parity
 */

use SafeAccessInline\SafeAccess;

$casesPath = __DIR__ . '/../../fixtures/cross-parity/cases.json';
$dataPath = __DIR__ . '/../../fixtures/cross-parity/data.json';

$casesJson = file_get_contents($casesPath);
$dataJson = file_get_contents($dataPath);

if ($casesJson === false || $dataJson === false) {
    throw new RuntimeException('Cannot read cross-parity fixture files');
}

/** @var array<int, array{id: string, description: string, path: string, defaultValue: mixed, expected: mixed}> $cases */
$cases = json_decode($casesJson, true, 512, JSON_THROW_ON_ERROR);

/** @var array<string, mixed> $data */
$data = json_decode($dataJson, true, 512, JSON_THROW_ON_ERROR);

$accessor = SafeAccess::fromArray($data);

describe('Cross-parity with JS', function () use ($cases, $accessor): void {
    foreach ($cases as $case) {
        // Cada caso exercita um edge case específico documentado na description da fixture
        it($case['id'], function () use ($accessor, $case): void {
            $result = $accessor->get($case['path'], $case['defaultValue']);
            expect($result)->toEqual($case['expected']);
        });
    }
});
