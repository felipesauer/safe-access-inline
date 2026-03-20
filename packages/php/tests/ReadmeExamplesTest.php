<?php

declare(strict_types=1);

/**
 * Tipo: README Examples
 * Garante que todos os exemplos PHP do README continuam funcionando.
 * Se qualquer teste aqui falhar, a API pública quebrou ou a doc está desatualizada.
 * Rodar: composer test -- --filter ReadmeExamplesTest
 */

use SafeAccessInline\Exceptions\InvalidFormatException;
use SafeAccessInline\Exceptions\ReadonlyViolationException;
use SafeAccessInline\SafeAccess;

describe(SafeAccess::class . ' — README examples', function (): void {

    $accessor = SafeAccess::from('{"user": {"name": "Ana"}, "items": [{"price": 10}, {"price": 50}]}');

    // Snippet 1: acesso simples com dot-notation — primeira coisa que o usuário vê no README
    it('get user.name returns "Ana"', function () use ($accessor): void {
        expect($accessor->get('user.name'))->toBe('Ana');
    });

    // Snippet 2: default value é a rede de segurança principal — nunca deve lançar exceção
    it('get user.email with default returns "N/A"', function () use ($accessor): void {
        expect($accessor->get('user.email', 'N/A'))->toBe('N/A');
    });

    // Snippet 3: wildcard é a feature principal — coleta valores de todos elementos do array
    it('get items.*.price returns [10, 50]', function () use ($accessor): void {
        expect($accessor->get('items.*.price'))->toBe([10, 50]);
    });

    // Snippet 4: filtro é a query avançada mostrada no README
    it('get items[?price>20].price returns [50]', function () use ($accessor): void {
        expect($accessor->get('items[?price>20].price'))->toBe([50]);
    });

    // Snippet 5: recursive descent (..) é o último exemplo na seção Quick Example
    it('get ..name returns ["Ana"]', function () use ($accessor): void {
        expect($accessor->get('..name'))->toBe(['Ana']);
    });

    // ── Error paths ─────────────────────────────────────────────────────────

    // Garante que JSON malformado nunca silencia a exceção
    it('fromJson() with invalid JSON throws InvalidFormatException', function (): void {
        expect(fn (): mixed => SafeAccess::fromJson('{not valid json}'))->toThrow(InvalidFormatException::class);
    });

    // Garante que get() com path malformado retorna o default — nunca crashar em produção
    it('get with a non-existent deep path returns the default', function () use ($accessor): void {
        expect($accessor->get('user.address.street.number', 'unknown'))->toBe('unknown');
    });

    // Garante que o contrato de readonly é aplicado em set()
    it('set() on a readonly accessor throws ReadonlyViolationException', function (): void {
        $ro = SafeAccess::fromJson('{"a":1}', readonly: true);
        expect(fn (): mixed => $ro->set('a', 2))->toThrow(ReadonlyViolationException::class);
    });
});
