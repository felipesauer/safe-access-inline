<?php

use SafeAccessInline\Contracts\SchemaAdapterInterface;
use SafeAccessInline\Contracts\SchemaValidationIssue;
use SafeAccessInline\Contracts\SchemaValidationResult;
use SafeAccessInline\Core\SchemaRegistry;
use SafeAccessInline\Exceptions\SchemaValidationException;
use SafeAccessInline\SafeAccess;

// Simple test adapter: schema is an assoc array of field => expected type
class SimpleSchemaAdapter implements SchemaAdapterInterface
{
    public function validate(mixed $data, mixed $schema): SchemaValidationResult
    {
        $errors = [];
        foreach ($schema as $key => $expectedType) {
            if (!array_key_exists($key, $data)) {
                $errors[] = new SchemaValidationIssue($key, "Missing required field '{$key}'");
            } elseif (gettype($data[$key]) !== $expectedType) {
                $actual = gettype($data[$key]);
                $errors[] = new SchemaValidationIssue($key, "Expected {$expectedType}, got {$actual}");
            }
        }
        return new SchemaValidationResult(count($errors) === 0, $errors);
    }
}

describe('Schema Validation', function () {

    beforeEach(function () {
        SchemaRegistry::clearDefaultAdapter();
    });

    it('validate passes when data matches schema', function () {
        $adapter = new SimpleSchemaAdapter();
        $accessor = SafeAccess::fromJson('{"name":"Ana","age":30}');
        $schema = ['name' => 'string', 'age' => 'integer'];
        $result = $accessor->validate($schema, $adapter);
        expect($result)->toBe($accessor);
    });

    it('validate throws SchemaValidationException on missing field', function () {
        $adapter = new SimpleSchemaAdapter();
        $accessor = SafeAccess::fromJson('{"name":"Ana"}');
        $schema = ['name' => 'string', 'age' => 'integer'];
        expect(fn () => $accessor->validate($schema, $adapter))
            ->toThrow(SchemaValidationException::class, 'Missing required field');
    });

    it('validate throws SchemaValidationException for type mismatch', function () {
        $adapter = new SimpleSchemaAdapter();
        $accessor = SafeAccess::fromJson('{"name":123}');
        $schema = ['name' => 'string'];
        expect(fn () => $accessor->validate($schema, $adapter))
            ->toThrow(SchemaValidationException::class, 'Expected string');
    });

    it('validate uses default adapter from SchemaRegistry', function () {
        $adapter = new SimpleSchemaAdapter();
        SchemaRegistry::setDefaultAdapter($adapter);
        $accessor = SafeAccess::fromJson('{"name":"Ana"}');
        $schema = ['name' => 'string'];
        expect(fn () => $accessor->validate($schema))->not->toThrow(SchemaValidationException::class);
    });

    it('validate throws when no adapter is available', function () {
        $accessor = SafeAccess::fromJson('{"name":"Ana"}');
        expect(fn () => $accessor->validate(['name' => 'string']))
            ->toThrow(\RuntimeException::class, 'No schema adapter provided');
    });

    it('SchemaRegistry can be cleared', function () {
        $adapter = new SimpleSchemaAdapter();
        SchemaRegistry::setDefaultAdapter($adapter);
        expect(SchemaRegistry::getDefaultAdapter())->toBe($adapter);
        SchemaRegistry::clearDefaultAdapter();
        expect(SchemaRegistry::getDefaultAdapter())->toBeNull();
    });

    it('SchemaValidationException has issues', function () {
        $issues = [
            new SchemaValidationIssue('name', 'required'),
            new SchemaValidationIssue('age', 'must be integer'),
        ];
        $ex = new SchemaValidationException($issues);
        expect($ex->getMessage())->toContain('name: required');
        expect($ex->getMessage())->toContain('age: must be integer');
        expect($ex->getIssues())->toBe($issues);
    });
});
