import { describe, it, expect, afterEach } from 'vitest';
import { SafeAccess } from '../../../../src/safe-access';
import { SchemaRegistry } from '../../../../src/core/registries/schema-registry';
import { SchemaValidationError } from '../../../../src/exceptions/schema-validation.error';
import type {
    SchemaAdapterInterface,
    SchemaValidationResult,
    SchemaValidationIssue,
} from '../../../../src/contracts/schema-adapter.interface';

// Simple test adapter: schema is a record of field → required type string
type SimpleSchema = Record<string, 'string' | 'number' | 'boolean'>;

class SimpleSchemaAdapter implements SchemaAdapterInterface<SimpleSchema> {
    validate(data: unknown, schema: SimpleSchema): SchemaValidationResult {
        const errors: SchemaValidationIssue[] = [];
        const obj = data as Record<string, unknown>;
        for (const [key, expectedType] of Object.entries(schema)) {
            if (!(key in obj)) {
                errors.push({ path: key, message: `Missing required field '${key}'` });
            } else if (typeof obj[key] !== expectedType) {
                errors.push({
                    path: key,
                    message: `Expected ${expectedType}, got ${typeof obj[key]}`,
                });
            }
        }
        return { valid: errors.length === 0, errors };
    }
}

describe('Schema Validation', () => {
    const adapter = new SimpleSchemaAdapter();

    afterEach(() => {
        SchemaRegistry.clearDefaultAdapter();
    });

    it('validate passes when data matches schema', () => {
        const accessor = SafeAccess.fromJson('{"name":"Ana","age":30}');
        const schema: SimpleSchema = { name: 'string', age: 'number' };
        const result = accessor.validate(schema, adapter);
        expect(result.valid).toBe(true);
        expect(result.errors).toHaveLength(0);
    });

    it('validate returns invalid result on failure', () => {
        const accessor = SafeAccess.fromJson('{"name":"Ana"}');
        const schema: SimpleSchema = { name: 'string', age: 'number' };
        const result = accessor.validate(schema, adapter);
        expect(result.valid).toBe(false);
        expect(result.errors).toHaveLength(1);
        expect(result.errors[0].path).toBe('age');
        expect(result.errors[0].message).toContain('Missing required field');
    });

    it('validate returns invalid result for type mismatch', () => {
        const accessor = SafeAccess.fromJson('{"name":123}');
        const schema: SimpleSchema = { name: 'string' };
        const result = accessor.validate(schema, adapter);
        expect(result.valid).toBe(false);
        expect(result.errors[0].message).toContain('Expected string');
    });

    it('validate uses default adapter from SchemaRegistry', () => {
        SchemaRegistry.setDefaultAdapter(adapter);
        const accessor = SafeAccess.fromJson('{"name":"Ana"}');
        const schema: SimpleSchema = { name: 'string' };
        const result = accessor.validate(schema);
        expect(result.valid).toBe(true);
    });

    it('validate throws when no adapter is available', () => {
        const accessor = SafeAccess.fromJson('{"name":"Ana"}');
        expect(() => accessor.validate({ name: 'string' })).toThrow('No schema adapter provided');
    });

    it('SchemaRegistry can be cleared', () => {
        SchemaRegistry.setDefaultAdapter(adapter);
        expect(SchemaRegistry.getDefaultAdapter()).toBe(adapter);
        SchemaRegistry.clearDefaultAdapter();
        expect(SchemaRegistry.getDefaultAdapter()).toBeNull();
    });

    it('SchemaValidationError has correct message format', () => {
        const error = new SchemaValidationError([
            { path: 'name', message: 'required' },
            { path: 'age', message: 'must be number' },
        ]);
        expect(error.message).toContain('name: required');
        expect(error.message).toContain('age: must be number');
        expect(error.name).toBe('SchemaValidationError');
    });
});
