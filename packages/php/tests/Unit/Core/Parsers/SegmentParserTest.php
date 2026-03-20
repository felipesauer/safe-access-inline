<?php

declare(strict_types=1);

use SafeAccessInline\Core\Parsers\SegmentParser;
use SafeAccessInline\Enums\SegmentType;

describe(SegmentParser::class, function () {

    // ── parseSegments — recursive descent via bracket syntax ───────────────

    it('parseSegments — ..["key1","key2"] produces DESCENT_MULTI segment', function () {
        // all-quoted multi-key descent emits a DESCENT_MULTI segment.
        $segments = SegmentParser::parseSegments("root..['tags','name']");

        expect($segments)->toHaveCount(2);
        expect($segments[0])->toBe(['type' => SegmentType::KEY, 'value' => 'root']);
        expect($segments[1]['type'])->toBe(SegmentType::DESCENT_MULTI);
        expect($segments[1]['keys'])->toBe(['tags', 'name']);
    });

    it('parseSegments — ..["key",unquoted] (mixed) trips allQuoted=false → DESCENT (lines 59-60)', function () {
        // When a comma-separated list inside ..[...] contains a non-quoted part,
        // $allQuoted becomes false (lines 59-60) and the expression falls through
        // to the unquoted-bracket DESCENT branch using the raw inner string as key.
        $segments = SegmentParser::parseSegments("root..['key1',unquoted]");

        expect($segments)->toHaveCount(2);
        expect($segments[0])->toBe(['type' => SegmentType::KEY, 'value' => 'root']);
        expect($segments[1])->toBe(['type' => SegmentType::DESCENT, 'key' => "'key1',unquoted"]);
    });

    it('parseSegments — ..["key"] (single-quoted bracket) produces DESCENT segment', function () {
        // preg_match single-quoted-bracket branch that emits a DESCENT segment.
        $segments = SegmentParser::parseSegments("root..['tag']");

        expect($segments)->toHaveCount(2);
        expect($segments[0])->toBe(['type' => SegmentType::KEY, 'value' => 'root']);
        expect($segments[1])->toBe(['type' => SegmentType::DESCENT, 'key' => 'tag']);
    });

    it('parseSegments — ..[unquotedKey] (unquoted bracket) produces DESCENT segment', function () {
        // The unquoted-bracket fallback emits a DESCENT segment.
        $segments = SegmentParser::parseSegments('root..[tag]');

        expect($segments)->toHaveCount(2);
        expect($segments[0])->toBe(['type' => SegmentType::KEY, 'value' => 'root']);
        expect($segments[1])->toBe(['type' => SegmentType::DESCENT, 'key' => 'tag']);
    });

    it('parseSegments — ..escaped\.dot in plain descent key decodes to literal dot (lines 81-82)', function () {
        // Inside a plain "..<key>" descent, a backslash-escaped dot (lines 81-82)
        // is decoded to a literal "." in the resulting key string.
        $segments = SegmentParser::parseSegments('store..price\.tax');

        expect($segments)->toHaveCount(2);
        expect($segments[0])->toBe(['type' => SegmentType::KEY, 'value' => 'store']);
        expect($segments[1])->toBe(['type' => SegmentType::DESCENT, 'key' => 'price.tax']);
    });

    it('parseSegments — ..key (plain dot-descent) produces non-empty DESCENT segment', function () {
        // `if ($key !== "")` guard emits a DESCENT segment for a plain bare key after "..".
        $segments = SegmentParser::parseSegments('store..price');

        expect($segments)->toHaveCount(2);
        expect($segments[0])->toBe(['type' => SegmentType::KEY, 'value' => 'store']);
        expect($segments[1])->toBe(['type' => SegmentType::DESCENT, 'key' => 'price']);
    });

    it('parseSegments — filter with nested brackets increments depth counter (line 104)', function () {
        // When a filter expression contains nested "[" characters (e.g. "@.tags[0]"),
        // the depth counter is incremented (line 104) so the matching "]" is found correctly.
        $segments = SegmentParser::parseSegments("items[?[@.tags[0] == 'a']]");

        expect($segments)->toHaveCount(2);
        expect($segments[0])->toBe(['type' => SegmentType::KEY, 'value' => 'items']);
        expect($segments[1]['type'])->toBe(SegmentType::FILTER);
    });

    it('parseSegments — [0,foo] (mixed non-numeric) falls through to KEY segment (lines 148-149)', function () {
        // Exercises the `allNumeric = false; break` path (lines 148-149) when
        // parts are neither all-quoted strings nor all-numeric integers.
        // The parser falls through to the catch-all KEY branch and emits the raw inner value.
        $segments = SegmentParser::parseSegments('root[0,foo]');

        // "root" KEY + "0,foo" KEY (the raw bracketed content is treated as a key).
        expect($segments)->toHaveCount(2);
        expect($segments[0])->toBe(['type' => SegmentType::KEY, 'value' => 'root']);
        expect($segments[1])->toBe(['type' => SegmentType::KEY, 'value' => '0,foo']);
    });

    it('parseSegments — ["a","b"] produces MULTI_KEY segment', function () {
        $segments = SegmentParser::parseSegments("root['a','b']");

        expect($segments)->toHaveCount(2);
        expect($segments[0])->toBe(['type' => SegmentType::KEY, 'value' => 'root']);
        expect($segments[1])->toBe(['type' => SegmentType::MULTI_KEY, 'keys' => ['a', 'b']]);
    });
});
