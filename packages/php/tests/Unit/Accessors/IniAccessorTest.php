<?php

declare(strict_types=1);

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

    // ── toIni serialization ────────────────────────────────────────────────────

    it('toIni — serializes flat keys without section header', function () {
        $accessor = IniAccessor::from("key=value\nnum=42");
        $ini = $accessor->toIni();
        expect($ini)->toContain('key = value');
        expect($ini)->toContain('num = 42');
    });

    it('toIni — serializes nested array as [section]', function () {
        $accessor = IniAccessor::from("[db]\nhost=localhost\nport=3306");
        $ini = $accessor->toIni();
        expect($ini)->toContain('[db]');
        expect($ini)->toContain('host = localhost');
        expect($ini)->toContain('port = 3306');
    });

    it('toIni — round-trips: toIni → from → all() equals original', function () {
        $original = IniAccessor::from("app=MyApp\n[db]\nhost=localhost\nport=3306");
        $roundTripped = IniAccessor::from($original->toIni());
        expect($roundTripped->all())->toEqual($original->all());
    });

    it('toIni — quotes values containing special characters', function () {
        $accessor = IniAccessor::from('key=value')->set('expr', 'a=b');
        $ini = $accessor->toIni();
        expect($ini)->toContain('expr = "a=b"');
    });

    it('toIni — serializes boolean true as literal true', function () {
        $accessor = IniAccessor::from('flag=true');
        $ini = $accessor->toIni();
        expect($ini)->toContain('flag = true');
    });

    it('toIni — serializes null as none', function () {
        $accessor = IniAccessor::from('key=value')->set('nullable', null);
        $ini = $accessor->toIni();
        expect($ini)->toContain('nullable = none');
    });

    it('toIni — ends with a trailing newline', function () {
        $ini = IniAccessor::from('key=value')->toIni();
        expect(str_ends_with($ini, "\n"))->toBeTrue();
    });

});
