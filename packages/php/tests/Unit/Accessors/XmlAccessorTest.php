<?php

declare(strict_types=1);

use SafeAccessInline\Accessors\XmlAccessor;
use SafeAccessInline\Exceptions\InvalidFormatException;
use SafeAccessInline\Exceptions\SecurityException;

describe(XmlAccessor::class, function () {

    it('from — valid XML string', function () {
        $accessor = XmlAccessor::from('<root><name>Ana</name></root>');
        expect($accessor)->toBeInstanceOf(XmlAccessor::class);
    });

    it('from — valid SimpleXMLElement', function () {
        $xml = new SimpleXMLElement('<root><name>Ana</name></root>');
        $accessor = XmlAccessor::from($xml);
        expect($accessor)->toBeInstanceOf(XmlAccessor::class);
    });

    it('from — invalid type throws', function () {
        XmlAccessor::from(123);
    })->throws(InvalidFormatException::class);

    it('from — invalid XML string throws', function () {
        XmlAccessor::from('<invalid xml>');
    })->throws(InvalidFormatException::class);

    it('get — simple key', function () {
        $accessor = XmlAccessor::from('<root><name>Ana</name><age>30</age></root>');
        expect($accessor->get('name'))->toBe('Ana');
        expect($accessor->get('age'))->toBe('30');
    });

    it('get — nested', function () {
        $accessor = XmlAccessor::from('<root><user><profile><name>Ana</name></profile></user></root>');
        expect($accessor->get('user.profile.name'))->toBe('Ana');
    });

    it('get — nonexistent returns default', function () {
        $accessor = XmlAccessor::from('<root><a>1</a></root>');
        expect($accessor->get('x.y.z', 'fallback'))->toBe('fallback');
    });

    it('has — existing', function () {
        $accessor = XmlAccessor::from('<root><name>Ana</name></root>');
        expect($accessor->has('name'))->toBeTrue();
    });

    it('has — nonexistent', function () {
        $accessor = XmlAccessor::from('<root><name>Ana</name></root>');
        expect($accessor->has('missing'))->toBeFalse();
    });

    it('set — immutable', function () {
        $accessor = XmlAccessor::from('<root><name>old</name></root>');
        $new = $accessor->set('name', 'new');
        expect($new->get('name'))->toBe('new');
        expect($accessor->get('name'))->toBe('old');
    });

    it('remove — existing', function () {
        $accessor = XmlAccessor::from('<root><a>1</a><b>2</b></root>');
        $new = $accessor->remove('b');
        expect($new->has('b'))->toBeFalse();
    });

    it('toArray', function () {
        $accessor = XmlAccessor::from('<root><name>Ana</name></root>');
        expect($accessor->toArray())->toBe(['name' => 'Ana']);
    });

    it('toJson', function () {
        $accessor = XmlAccessor::from('<root><name>Ana</name></root>');
        expect(json_decode($accessor->toJson(), true))->toBe(['name' => 'Ana']);
    });

    it('toXml — preserves original string', function () {
        $xml = '<root><name>Ana</name></root>';
        $accessor = XmlAccessor::from($xml);
        expect($accessor->toXml())->toBe($xml);
    });

    it('toXml — after set, still returns original XML (preserves source)', function () {
        $xml = '<root><name>Ana</name></root>';
        $accessor = XmlAccessor::from($xml);
        $modified = $accessor->set('age', '30');
        // XmlAccessor::toXml() always returns the original XML string
        expect($modified->toXml())->toBe($xml);
        // But the data is updated
        expect($modified->get('age'))->toBe('30');
    });

    it('getOriginalXml returns original', function () {
        $xml = '<root><name>Ana</name></root>';
        $accessor = XmlAccessor::from($xml);
        expect($accessor->getOriginalXml())->toBe($xml);
    });

    it('type', function () {
        $accessor = XmlAccessor::from('<root><name>Ana</name></root>');
        expect($accessor->type('name'))->toBe('string');
        expect($accessor->type('missing'))->toBeNull();
    });

    it('count and keys', function () {
        $accessor = XmlAccessor::from('<root><a>1</a><b>2</b></root>');
        expect($accessor->count())->toBe(2);
        expect($accessor->keys())->toBe(['a', 'b']);
    });

    it('handles repeated tags as arrays', function () {
        $xmlItems = '<root><item>A</item><item>B</item><item>C</item></root>';
        $accessor = XmlAccessor::from($xmlItems);
        expect($accessor->get('item'))->toBe(['A', 'B', 'C']);
    });

    it('handles self-closing tags', function () {
        $xmlSelfClose = '<root><item/><other>val</other></root>';
        $accessor = XmlAccessor::from($xmlSelfClose);
        expect($accessor->has('item'))->toBeTrue();
        expect($accessor->get('other'))->toBe('val');
    });

    it('handles XML with attributes (empty element)', function () {
        $xmlAttrs = '<root><item id="1" type="main"/></root>';
        $accessor = XmlAccessor::from($xmlAttrs);
        expect($accessor->get('item.@attributes.id'))->toBe('1');
        expect($accessor->get('item.@attributes.type'))->toBe('main');
    });

    it('handles XML with text and attributes (SimpleXML json_encode quirk)', function () {
        $xmlAttrsText = '<root><item id="1" type="main">text</item></root>';
        $accessor = XmlAccessor::from($xmlAttrsText);
        // Unlike JS which parses explicitly, PHP SimpleXML drops attributes when json serialized as a scalar string
        expect($accessor->get('item'))->toBe('text');
        expect($accessor->has('item.@attributes'))->toBeFalse();
    });

    it('toXml returns asXML when created from SimpleXMLElement', function () {
        $xml = new SimpleXMLElement('<root><name>Ana</name></root>');
        $accessor = XmlAccessor::from($xml);
        $result = $accessor->toXml();
        expect($result)->toContain('<name>Ana</name>');
    });

    // ── XML Hardening (XXE Prevention) ──────────────

    it('rejects XML with DOCTYPE declaration', function () {
        $xxeXml = '<!DOCTYPE foo [<!ENTITY xxe SYSTEM "file:///etc/passwd">]><root><name>&xxe;</name></root>';
        expect(fn () => XmlAccessor::from($xxeXml))->toThrow(SecurityException::class);
    });

    it('rejects XML with ENTITY declaration', function () {
        // ENTITY without DOCTYPE — tests the ENTITY check separately
        $entityXml = '<?xml version="1.0"?><!ENTITY test "value"><root><a>1</a></root>';
        expect(fn () => XmlAccessor::from($entityXml))->toThrow(SecurityException::class, 'ENTITY');
    });

    it('rejects XML with DOCTYPE even without entities', function () {
        $doctypeXml = '<!DOCTYPE root SYSTEM "test.dtd"><root><a>1</a></root>';
        expect(fn () => XmlAccessor::from($doctypeXml))->toThrow(SecurityException::class);
    });

    // ── P3: maxXmlDepth ──────────────────────────────

    it('rejects XML exceeding default max depth (P3)', function () {
        // Build a deeply nested XML structure exceeding ParserConfig::DEFAULT_MAX_XML_DEPTH (100)
        $inner = '';
        for ($i = 0; $i < 110; $i++) {
            $inner = "<item{$i}>{$inner}</item{$i}>";
        }
        $deep = "<root>{$inner}</root>";
        expect(fn () => XmlAccessor::from($deep))->toThrow(SecurityException::class);
    });

    it('accepts XML within default max depth (P3)', function () {
        // 5-level nesting is well within the 100 default
        $xml = '<root><a><b><c><d><e>leaf</e></d></c></b></a></root>';
        $accessor = XmlAccessor::from($xml);
        expect($accessor->get('a.b.c.d.e'))->toBe('leaf');
    });

    // ── P4: SecurityGuard on tag/attribute names ──────

    it('rejects XML containing a __proto__ tag name (P4)', function () {
        $xml = '<root><__proto__>evil</__proto__></root>';
        expect(fn () => XmlAccessor::from($xml))->toThrow(SecurityException::class);
    });

    it('rejects XML containing a constructor tag name (P4)', function () {
        $xml = '<root><constructor>evil</constructor></root>';
        expect(fn () => XmlAccessor::from($xml))->toThrow(SecurityException::class);
    });

});
