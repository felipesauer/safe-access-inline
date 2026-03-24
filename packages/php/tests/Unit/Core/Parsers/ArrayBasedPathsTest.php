<?php

declare(strict_types=1);

use SafeAccessInline\Core\Parsers\DotNotationParser;
use SafeAccessInline\SafeAccess;

describe('Array-based paths', function () {

    it('getAt retrieves value by array segments', function () {
        $accessor = SafeAccess::fromJson('{"a":{"b":{"c":"deep"}}}');
        expect($accessor->getAt(['a', 'b', 'c']))->toBe('deep');
    });

    it('getAt returns default for missing path', function () {
        $accessor = SafeAccess::fromJson('{"a":1}');
        expect($accessor->getAt(['x', 'y'], 'fallback'))->toBe('fallback');
    });

    it('hasAt checks existence by segments', function () {
        $accessor = SafeAccess::fromJson('{"a":{"b":1}}');
        expect($accessor->hasAt(['a', 'b']))->toBeTrue();
        expect($accessor->hasAt(['a', 'c']))->toBeFalse();
    });

    it('setAt sets value by array segments', function () {
        $accessor = SafeAccess::fromJson('{"a":{"b":1}}');
        $result = $accessor->setAt(['a', 'c'], 99);
        expect($result->get('a.c'))->toBe(99);
        expect($accessor->get('a.c'))->toBeNull(); // immutable
    });

    it('removeAt removes a path by segments', function () {
        $accessor = SafeAccess::fromJson('{"a":{"b":1,"c":2}}');
        $result = $accessor->removeAt(['a', 'b']);
        expect($result->has('a.b'))->toBeFalse();
        expect($result->get('a.c'))->toBe(2);
    });
});

describe('Template paths (DotNotationParser)', function () {

    it('getBySegments retrieves literal path', function () {
        $data = ['a' => ['b' => ['c' => 'val']]];
        expect(DotNotationParser::getBySegments($data, ['a', 'b', 'c']))->toBe('val');
    });

    it('setBySegments sets by literal segments', function () {
        $data = ['a' => ['b' => 1]];
        $result = DotNotationParser::setBySegments($data, ['a', 'c'], 99);
        expect($result['a']['c'])->toBe(99);
    });

    it('removeBySegments removes by literal segments', function () {
        $data = ['a' => ['b' => 1, 'c' => 2]];
        $result = DotNotationParser::removeBySegments($data, ['a', 'b']);
        expect(array_key_exists('b', $result['a']))->toBeFalse();
        expect($result['a']['c'])->toBe(2);
    });

    it('setBySegments creates intermediate arrays when segment is missing', function () {
        $data = ['a' => 1];
        $result = DotNotationParser::setBySegments($data, ['x', 'y', 'z'], 'val');
        expect($result['x']['y']['z'])->toBe('val');
    });

    it('removeBySegments returns unchanged data when intermediate segment does not exist', function () {
        $data = ['a' => 1];
        $result = DotNotationParser::removeBySegments($data, ['missing', 'child']);
        expect($result)->toBe($data);
    });
});
