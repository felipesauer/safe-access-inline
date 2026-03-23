<?php

declare(strict_types=1);

use SafeAccessInline\Accessors\ObjectAccessor;
use SafeAccessInline\Core\CompiledPath;
use SafeAccessInline\SafeAccess;

afterEach(function (): void {
    SafeAccess::resetAll();
});

describe(CompiledPath::class, function (): void {

    it('SafeAccess::compilePath — returns a CompiledPath instance', function (): void {
        expect(SafeAccess::compilePath('user.name'))->toBeInstanceOf(CompiledPath::class);
    });

    it('SafeAccess::compilePath — compiled path has non-empty segments', function (): void {
        $compiled = SafeAccess::compilePath('user.name');
        expect($compiled->segments())->toBeArray()->toHaveCount(2);
    });

    it('getCompiled — resolves value at pre-compiled path', function (): void {
        $compiled = SafeAccess::compilePath('user.name');
        $accessor = ObjectAccessor::from((object) ['user' => ['name' => 'Ana']]);
        expect($accessor->getCompiled($compiled))->toBe('Ana');
    });

    it('getCompiled — returns null by default when path is missing', function (): void {
        $compiled = SafeAccess::compilePath('user.name');
        expect(ObjectAccessor::from((object) [])->getCompiled($compiled))->toBeNull();
    });

    it('getCompiled — returns provided default when path is missing', function (): void {
        $compiled = SafeAccess::compilePath('user.name');
        expect(ObjectAccessor::from((object) [])->getCompiled($compiled, 'N/A'))->toBe('N/A');
    });

    it('getCompiled — same compiled path works correctly across multiple accessors', function (): void {
        $compiled = SafeAccess::compilePath('name');
        $a1 = ObjectAccessor::from((object) ['name' => 'Ana']);
        $a2 = ObjectAccessor::from((object) ['name' => 'Bob']);
        expect($a1->getCompiled($compiled))->toBe('Ana');
        expect($a2->getCompiled($compiled))->toBe('Bob');
    });

    it('getCompiled — supports nested paths', function (): void {
        $compiled = SafeAccess::compilePath('a.b.c');
        expect(
            ObjectAccessor::from((object) ['a' => ['b' => ['c' => 42]]])->getCompiled($compiled)
        )->toBe(42);
    });

    it('getCompiled — supports wildcard paths', function (): void {
        $compiled = SafeAccess::compilePath('items.*.label');
        $accessor = ObjectAccessor::from((object) [
            'items' => [['label' => 'x'], ['label' => 'y']],
        ]);
        expect($accessor->getCompiled($compiled))->toBe(['x', 'y']);
    });

});
