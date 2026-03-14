<?php

use SafeAccessInline\SafeAccess;
use SafeAccessInline\Security\DataMasker;

describe(DataMasker::class, function () {

    it('redacts common sensitive keys', function () {
        $data = ['username' => 'john', 'password' => 'secret123', 'email' => 'john@test.com'];
        $result = DataMasker::mask($data);
        expect($result['username'])->toBe('john');
        expect($result['password'])->toBe('[REDACTED]');
        expect($result['email'])->toBe('john@test.com');
    });

    it('redacts nested sensitive keys', function () {
        $data = ['db' => ['host' => 'localhost', 'password' => 'dbpass']];
        $result = DataMasker::mask($data);
        expect($result)->toBe(['db' => ['host' => 'localhost', 'password' => '[REDACTED]']]);
    });

    it('redacts all common sensitive key names', function () {
        $data = [
            'password' => '1', 'secret' => '2', 'token' => '3', 'api_key' => '4',
            'apikey' => '5', 'private_key' => '6', 'passphrase' => '7', 'credential' => '8',
            'auth' => '9', 'authorization' => '10', 'cookie' => '11', 'session' => '12',
            'ssn' => '13', 'credit_card' => '14',
        ];
        $result = DataMasker::mask($data);
        foreach ($result as $val) {
            expect($val)->toBe('[REDACTED]');
        }
    });

    it('supports custom string patterns', function () {
        $data = ['my_field' => 'value', 'other' => 'keep'];
        $result = DataMasker::mask($data, ['my_field']);
        expect($result['my_field'])->toBe('[REDACTED]');
        expect($result['other'])->toBe('keep');
    });

    it('supports wildcard patterns', function () {
        $data = ['db_password' => 'x', 'db_host' => 'y', 'cache_key' => 'z'];
        $result = DataMasker::mask($data, ['db_*']);
        expect($result['db_password'])->toBe('[REDACTED]');
        expect($result['db_host'])->toBe('[REDACTED]');
        expect($result['cache_key'])->toBe('z'); // not matched by db_* pattern
    });

    it('handles arrays with objects', function () {
        $data = ['users' => [['name' => 'A', 'password' => 'p1'], ['name' => 'B', 'password' => 'p2']]];
        $result = DataMasker::mask($data);
        expect($result['users'][0]['name'])->toBe('A');
        expect($result['users'][0]['password'])->toBe('[REDACTED]');
        expect($result['users'][1]['password'])->toBe('[REDACTED]');
    });

    it('does not mutate original data', function () {
        $data = ['password' => 'secret'];
        $result = DataMasker::mask($data);
        expect($data['password'])->toBe('secret');
        expect($result['password'])->toBe('[REDACTED]');
    });

    it('handles empty data', function () {
        expect(DataMasker::mask([]))->toBe([]);
    });

    it('is case-insensitive for common keys', function () {
        $data = ['Password' => 'x', 'TOKEN' => 'y', 'Api_Key' => 'z'];
        $result = DataMasker::mask($data);
        expect($result['Password'])->toBe('[REDACTED]');
        expect($result['TOKEN'])->toBe('[REDACTED]');
        expect($result['Api_Key'])->toBe('[REDACTED]');
    });
});

describe('AbstractAccessor::masked()', function () {
    it('returns a new accessor with masked data', function () {
        $accessor = SafeAccess::fromJson('{"user":"john","password":"secret"}');
        $masked = $accessor->masked();
        expect($masked->get('user'))->toBe('john');
        expect($masked->get('password'))->toBe('[REDACTED]');
        expect($accessor->get('password'))->toBe('secret');
    });

    it('accepts custom patterns', function () {
        $accessor = SafeAccess::fromJson('{"my_field":"val","other":"keep"}');
        $masked = $accessor->masked(['my_field']);
        expect($masked->get('my_field'))->toBe('[REDACTED]');
        expect($masked->get('other'))->toBe('keep');
    });
});
