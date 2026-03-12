<?php

use SafeAccessInline\Accessors\IniAccessor;
use SafeAccessInline\Exceptions\InvalidFormatException;

describe(IniAccessor::class, function () {

    it('from — valid INI', function () {
        $accessor = IniAccessor::from("[section]\nkey=value");
        expect($accessor)->toBeInstanceOf(IniAccessor::class);
    });

    it('from — invalid type throws', function () {
        IniAccessor::from(123);
    })->throws(InvalidFormatException::class);

    it('get — section + key', function () {
        $accessor = IniAccessor::from("[database]\nhost=localhost\nport=3306");
        expect($accessor->get('database.host'))->toBe('localhost');
        expect($accessor->get('database.port'))->toBe(3306);
    });

    it('get — nonexistent returns default', function () {
        $accessor = IniAccessor::from("[section]\nkey=value");
        expect($accessor->get('missing.key', 'default'))->toBe('default');
    });

    it('has — existing', function () {
        $accessor = IniAccessor::from("[section]\nkey=value");
        expect($accessor->has('section.key'))->toBeTrue();
    });

    it('has — nonexistent', function () {
        $accessor = IniAccessor::from("[section]\nkey=value");
        expect($accessor->has('section.missing'))->toBeFalse();
    });

    it('set — immutable', function () {
        $accessor = IniAccessor::from("[section]\nkey=old");
        $new = $accessor->set('section.key', 'new');
        expect($new->get('section.key'))->toBe('new');
        expect($accessor->get('section.key'))->toBe('old');
    });

    it('remove — existing', function () {
        $accessor = IniAccessor::from("[section]\na=1\nb=2");
        $new = $accessor->remove('section.b');
        expect($new->has('section.b'))->toBeFalse();
    });

    it('toArray', function () {
        $accessor = IniAccessor::from("[section]\nkey=value");
        $arr = $accessor->toArray();
        expect($arr['section']['key'])->toBe('value');
    });

    it('toJson', function () {
        $accessor = IniAccessor::from("[section]\nkey=value");
        $decoded = json_decode($accessor->toJson(), true);
        expect($decoded['section']['key'])->toBe('value');
    });

    it('count and keys', function () {
        $accessor = IniAccessor::from("[a]\nx=1\n[b]\ny=2");
        expect($accessor->count())->toBe(2);
        expect($accessor->keys())->toBe(['a', 'b']);
    });

    it('from — invalid INI content throws', function () {
        // Malformed INI: unclosed quote causes parse_ini_string to return false
        IniAccessor::from("[section]\nkey=\"unclosed");
    })->throws(InvalidFormatException::class);

});
