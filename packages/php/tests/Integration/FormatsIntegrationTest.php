<?php

declare(strict_types=1);

/**
 * Tipo: Integration — Multi-format
 * Verifica que JSON, YAML, XML e CSV produzem resultados idênticos para as mesmas queries.
 * Usa o mesmo dataset canônico serializado em cada formato.
 * Se falhar, o bug está no adapter de formato, não no engine de acesso.
 * Rodar: composer test -- --filter FormatsIntegrationTest
 */

use SafeAccessInline\SafeAccess;

describe('Multi-format integration', function (): void {

    $jsonString = '{"user":{"name":"Ana","age":30},"items":[{"name":"Widget","price":10},{"name":"Gadget","price":50},{"name":"Gizmo","price":25}]}';

    $csvString = "name,price\nWidget,10\nGadget,50\nGizmo,25";

    // JSON é o formato de referência — todos os demais são comparados contra ele
    describe('JSON accessor queries', function () use ($jsonString): void {
        $accessor = SafeAccess::fromJson($jsonString);

        it('simple path: user.name', function () use ($accessor): void {
            expect($accessor->get('user.name'))->toBe('Ana');
        });

        it('wildcard: items.*.price', function () use ($accessor): void {
            expect($accessor->get('items.*.price'))->toBe([10, 50, 25]);
        });

        it('filter: items[?price>20].name', function () use ($accessor): void {
            expect($accessor->get('items[?price>20].name'))->toBe(['Gadget', 'Gizmo']);
        });

        it('default for missing path: user.nonexistent', function () use ($accessor): void {
            expect($accessor->get('user.nonexistent', 'N/A'))->toBe('N/A');
        });

        it('array index: items.0.name', function () use ($accessor): void {
            expect($accessor->get('items.0.name'))->toBe('Widget');
        });
    });

    // YAML deve produzir os mesmos resultados que JSON para os mesmos dados lógicos
    describe('YAML accessor queries', function (): void {
        $yamlString = "user:\n  name: Ana\n  age: 30\nitems:\n  - name: Widget\n    price: 10\n  - name: Gadget\n    price: 50\n  - name: Gizmo\n    price: 25";
        $accessor = SafeAccess::fromYaml($yamlString);

        it('simple path: user.name', function () use ($accessor): void {
            expect($accessor->get('user.name'))->toBe('Ana');
        });

        it('wildcard: items.*.price', function () use ($accessor): void {
            expect($accessor->get('items.*.price'))->toBe([10, 50, 25]);
        });

        it('filter: items[?price>20].name', function () use ($accessor): void {
            expect($accessor->get('items[?price>20].name'))->toBe(['Gadget', 'Gizmo']);
        });

        it('default for missing path: user.nonexistent', function () use ($accessor): void {
            expect($accessor->get('user.nonexistent', 'N/A'))->toBe('N/A');
        });

        it('array index: items.0.name', function () use ($accessor): void {
            expect($accessor->get('items.0.name'))->toBe('Widget');
        });
    })->skip(!class_exists(\Symfony\Component\Yaml\Yaml::class), 'symfony/yaml not installed');

    // XML tem conversão de tipos diferente (tudo é string) — testa subset equivalente
    describe('XML accessor queries', function (): void {
        $xmlString = '<root><user><name>Ana</name><age>30</age></user></root>';
        $accessor = SafeAccess::fromXml($xmlString);

        it('simple path: user.name', function () use ($accessor): void {
            expect($accessor->get('user.name'))->toBe('Ana');
        });

        it('default for missing path: user.nonexistent', function () use ($accessor): void {
            expect($accessor->get('user.nonexistent', 'N/A'))->toBe('N/A');
        });
    });

    // CSV é flat (apenas linhas) — testa com o subtabela de items
    describe('CSV accessor queries', function () use ($csvString): void {
        $accessor = SafeAccess::fromCsv($csvString);

        it('array index: 0.name', function () use ($accessor): void {
            expect($accessor->get('0.name'))->toBe('Widget');
        });

        it('wildcard: *.name', function () use ($accessor): void {
            expect($accessor->get('*.name'))->toBe(['Widget', 'Gadget', 'Gizmo']);
        });

        it('default for missing path: 0.nonexistent', function () use ($accessor): void {
            expect($accessor->get('0.nonexistent', 'N/A'))->toBe('N/A');
        });

        it('array index: 2.name', function () use ($accessor): void {
            expect($accessor->get('2.name'))->toBe('Gizmo');
        });
    });
});
