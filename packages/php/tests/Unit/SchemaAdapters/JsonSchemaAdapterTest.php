<?php

use SafeAccessInline\SchemaAdapters\JsonSchemaAdapter;

describe('JsonSchemaAdapter', function () {
    it('validates valid data', function () {
        $adapter = new JsonSchemaAdapter();
        $schema = [
            'type' => 'object',
            'required' => ['name', 'age'],
            'properties' => [
                'name' => ['type' => 'string'],
                'age' => ['type' => 'number', 'minimum' => 0],
            ],
        ];
        $result = $adapter->validate(['name' => 'Ana', 'age' => 25], $schema);
        expect($result->valid)->toBeTrue();
        expect($result->errors)->toBeEmpty();
    });

    it('detects missing required fields', function () {
        $adapter = new JsonSchemaAdapter();
        $schema = [
            'type' => 'object',
            'required' => ['name', 'age'],
        ];
        $result = $adapter->validate(['name' => 'Ana'], $schema);
        expect($result->valid)->toBeFalse();
        expect($result->errors)->toHaveCount(1);
        expect($result->errors[0]->path)->toBe('$.age');
        expect($result->errors[0]->message)->toBe('Required field missing');
    });

    it('validates type mismatch', function () {
        $adapter = new JsonSchemaAdapter();
        $schema = ['type' => 'string'];
        $result = $adapter->validate(42, $schema);
        expect($result->valid)->toBeFalse();
        expect($result->errors[0]->message)->toContain("Expected type 'string'");
    });

    it('validates minimum and maximum', function () {
        $adapter = new JsonSchemaAdapter();

        $schema = ['type' => 'number', 'minimum' => 10];
        $result = $adapter->validate(5, $schema);
        expect($result->valid)->toBeFalse();
        expect($result->errors[0]->message)->toContain('less than minimum');

        $schema = ['type' => 'number', 'maximum' => 10];
        $result = $adapter->validate(15, $schema);
        expect($result->valid)->toBeFalse();
        expect($result->errors[0]->message)->toContain('exceeds maximum');
    });

    it('validates string length constraints', function () {
        $adapter = new JsonSchemaAdapter();

        $schema = ['type' => 'string', 'minLength' => 5];
        $result = $adapter->validate('hi', $schema);
        expect($result->valid)->toBeFalse();

        $schema = ['type' => 'string', 'maxLength' => 3];
        $result = $adapter->validate('hello', $schema);
        expect($result->valid)->toBeFalse();
    });

    it('validates enum values', function () {
        $adapter = new JsonSchemaAdapter();
        $schema = ['enum' => ['red', 'green', 'blue']];

        $result = $adapter->validate('red', $schema);
        expect($result->valid)->toBeTrue();

        $result = $adapter->validate('yellow', $schema);
        expect($result->valid)->toBeFalse();
    });

    it('validates pattern', function () {
        $adapter = new JsonSchemaAdapter();
        $schema = ['type' => 'string', 'pattern' => '^[A-Z]+$'];

        $result = $adapter->validate('HELLO', $schema);
        expect($result->valid)->toBeTrue();

        $result = $adapter->validate('hello', $schema);
        expect($result->valid)->toBeFalse();
    });

    it('validates nested properties', function () {
        $adapter = new JsonSchemaAdapter();
        $schema = [
            'type' => 'object',
            'properties' => [
                'user' => [
                    'type' => 'object',
                    'required' => ['name'],
                    'properties' => [
                        'name' => ['type' => 'string'],
                    ],
                ],
            ],
        ];
        $result = $adapter->validate(['user' => ['name' => 42]], $schema);
        expect($result->valid)->toBeFalse();
        expect($result->errors[0]->path)->toBe('$.user.name');
    });

    it('validates array items', function () {
        $adapter = new JsonSchemaAdapter();
        $schema = [
            'type' => 'array',
            'items' => ['type' => 'string'],
        ];
        $result = $adapter->validate(['a', 'b', 42], $schema);
        expect($result->valid)->toBeFalse();
        expect($result->errors)->toHaveCount(1);
        expect($result->errors[0]->path)->toBe('$[2]');
    });

    it('accepts JSON string as schema', function () {
        $adapter = new JsonSchemaAdapter();
        $schema = '{"type": "object", "required": ["name"]}';
        $result = $adapter->validate(['name' => 'Ana'], $schema);
        expect($result->valid)->toBeTrue();
    });
});
