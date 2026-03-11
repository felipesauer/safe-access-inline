<?php

use SafeAccessInline\Accessors\XmlAccessor;
use SafeAccessInline\Exceptions\InvalidFormatException;

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

});
