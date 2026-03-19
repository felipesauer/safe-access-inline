import { describe, it, expect } from 'vitest';
import { JsonSchemaAdapter } from '../../../src/schema-adapters/json-schema.adapter';

describe(JsonSchemaAdapter.name, () => {
    const adapter = new JsonSchemaAdapter();

    it('returns valid for matching data', () => {
        const schema = {
            type: 'object',
            required: ['name'],
            properties: { name: { type: 'string' } },
        };
        const result = adapter.validate({ name: 'Ana' }, schema);
        expect(result.valid).toBe(true);
        expect(result.errors).toEqual([]);
    });

    it('detects type mismatch', () => {
        const schema = { type: 'string' };
        const result = adapter.validate(42, schema);
        expect(result.valid).toBe(false);
        expect(result.errors[0].path).toBe('$');
        expect(result.errors[0].message).toContain("expected type 'string'");
    });

    it('detects missing required fields', () => {
        const schema = { type: 'object', required: ['name', 'age'] };
        const result = adapter.validate({ name: 'Ana' }, schema);
        expect(result.valid).toBe(false);
        expect(result.errors).toEqual([{ path: '$.age', message: 'required field missing' }]);
    });

    it('validates nested properties', () => {
        const schema = {
            type: 'object',
            properties: { user: { type: 'object', properties: { age: { type: 'number' } } } },
        };
        const result = adapter.validate({ user: { age: 'not-a-number' } }, schema);
        expect(result.valid).toBe(false);
        expect(result.errors[0].path).toBe('$.user.age');
    });

    it('validates array items', () => {
        const schema = { type: 'array', items: { type: 'number' } };
        const result = adapter.validate([1, 'two', 3], schema);
        expect(result.valid).toBe(false);
        expect(result.errors).toHaveLength(1);
        expect(result.errors[0].path).toBe('$[1]');
    });

    it('validates minimum and maximum', () => {
        const schema = { type: 'number', minimum: 1, maximum: 10 };
        expect(adapter.validate(0, schema).errors[0].message).toContain('less than minimum');
        expect(adapter.validate(11, schema).errors[0].message).toContain('exceeds maximum');
        expect(adapter.validate(5, schema).valid).toBe(true);
    });

    it('validates minLength and maxLength', () => {
        const schema = { type: 'string', minLength: 2, maxLength: 5 };
        expect(adapter.validate('a', schema).errors[0].message).toContain('minLength');
        expect(adapter.validate('toolong', schema).errors[0].message).toContain('maxLength');
        expect(adapter.validate('ok', schema).valid).toBe(true);
    });

    it('validates enum constraint', () => {
        const schema = { enum: ['a', 'b', 'c'] };
        expect(adapter.validate('d', schema).valid).toBe(false);
        expect(adapter.validate('a', schema).valid).toBe(true);
    });

    it('supports type as array', () => {
        const schema = { type: ['string', 'null'] };
        expect(adapter.validate('ok', schema).valid).toBe(true);
        expect(adapter.validate(null, schema).valid).toBe(true);
        expect(adapter.validate(42, schema).valid).toBe(false);
    });

    it('handles schema with no constraints', () => {
        const result = adapter.validate({ anything: true }, {});
        expect(result.valid).toBe(true);
    });

    it('skips validation for optional properties absent from data', () => {
        const schema = {
            type: 'object',
            properties: { name: { type: 'string' }, email: { type: 'string' } },
        };
        const result = adapter.validate({ name: 'Ana' }, schema);
        expect(result.valid).toBe(true);
    });
});
