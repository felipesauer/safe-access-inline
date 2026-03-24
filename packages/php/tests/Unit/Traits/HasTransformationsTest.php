<?php

declare(strict_types=1);

use SafeAccessInline\Accessors\ArrayAccessor;
use SafeAccessInline\Traits\HasTransformations;

describe(HasTransformations::class, function () {

    it('toJson with flags', function () {
        $accessor = ArrayAccessor::from(['name' => 'Ana']);
        $json = $accessor->toJson(JSON_PRETTY_PRINT);
        expect($json)->toContain("\n");
        expect(json_decode($json, true))->toBe(['name' => 'Ana']);
    });

    it('toJson with bool true produces pretty output', function () {
        $accessor = ArrayAccessor::from(['a' => 1]);
        $json = $accessor->toJson(true);
        expect($json)->toContain("\n");
        expect(json_decode($json, true))->toBe(['a' => 1]);
    });

    it('toJson with bool false produces compact output', function () {
        $accessor = ArrayAccessor::from(['a' => 1]);
        $json = $accessor->toJson(false);
        expect($json)->toBe('{"a":1}');
    });

    it('toJson with [pretty => true] produces pretty output', function () {
        $accessor = ArrayAccessor::from(['a' => 1]);
        $json = $accessor->toJson(['pretty' => true]);
        expect($json)->toContain("\n");
        expect(json_decode($json, true))->toBe(['a' => 1]);
    });

    it('toJson with [pretty => false] produces compact output', function () {
        $accessor = ArrayAccessor::from(['a' => 1]);
        $json = $accessor->toJson(['pretty' => false]);
        expect($json)->toBe('{"a":1}');
    });

    it('toJson with [unescapeUnicode => true] does not escape unicode', function () {
        $accessor = ArrayAccessor::from(['greeting' => 'Olá']);
        $json = $accessor->toJson(['unescapeUnicode' => true]);
        expect($json)->toContain('Olá');
    });

    it('toJson with [unescapeSlashes => true] does not escape slashes', function () {
        $accessor = ArrayAccessor::from(['url' => 'https://example.com/path']);
        $json = $accessor->toJson(['unescapeSlashes' => true]);
        expect($json)->toContain('https://example.com/path');
        expect($json)->not()->toContain('\\/');
    });

    it('toJson with [space => 2] produces indented output', function () {
        $accessor = ArrayAccessor::from(['a' => 1]);
        $json = $accessor->toJson(['space' => 2]);
        expect($json)->toContain("\n");
        expect(json_decode($json, true))->toBe(['a' => 1]);
    });

    it('toJson with combined options applies all flags', function () {
        $accessor = ArrayAccessor::from(['greeting' => 'Olá', 'url' => 'a/b']);
        $json = $accessor->toJson(['pretty' => true, 'unescapeUnicode' => true, 'unescapeSlashes' => true]);
        expect($json)->toContain("\n");
        expect($json)->toContain('Olá');
        expect($json)->toContain('a/b');
        expect($json)->not()->toContain('\\/');
    });

});
