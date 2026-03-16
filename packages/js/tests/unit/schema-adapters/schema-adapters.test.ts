import { describe, it, expect } from 'vitest';
import { ZodSchemaAdapter } from '../../../src/schema-adapters/zod.adapter';
import { ValibotSchemaAdapter } from '../../../src/schema-adapters/valibot.adapter';
import { YupSchemaAdapter } from '../../../src/schema-adapters/yup.adapter';
import { JsonSchemaAdapter } from '../../../src/schema-adapters/json-schema.adapter';

describe('ZodSchemaAdapter', () => {
    const adapter = new ZodSchemaAdapter();

    it('returns empty errors when result.error is undefined', () => {
        const schema = { safeParse: () => ({ success: false as const }) };
        const result = adapter.validate({}, schema);
        expect(result.valid).toBe(false);
        expect(result.errors).toEqual([]);
    });

    it('returns valid for passing data', () => {
        const schema = {
            safeParse: (data: unknown) => ({ success: true, data }),
        };
        const result = adapter.validate({ name: 'Ana' }, schema);
        expect(result.valid).toBe(true);
        expect(result.errors).toEqual([]);
    });

    it('returns errors for failing data', () => {
        const schema = {
            safeParse: () => ({
                success: false,
                error: {
                    issues: [
                        { path: ['name'], message: 'Required' },
                        { path: ['user', 'age'], message: 'Expected number' },
                    ],
                },
            }),
        };
        const result = adapter.validate({}, schema);
        expect(result.valid).toBe(false);
        expect(result.errors).toEqual([
            { path: 'name', message: 'Required' },
            { path: 'user.age', message: 'Expected number' },
        ]);
    });

    it('uses $ as path for root-level errors', () => {
        const schema = {
            safeParse: () => ({
                success: false,
                error: { issues: [{ path: [], message: 'Invalid input' }] },
            }),
        };
        const result = adapter.validate(null, schema);
        expect(result.errors[0].path).toBe('$');
    });
});

describe('ValibotSchemaAdapter', () => {
    it('returns empty errors when issues is undefined on failure', () => {
        const safeParse = () => ({ success: false as const });
        const adapter = new ValibotSchemaAdapter(safeParse);
        const result = adapter.validate({}, {});
        expect(result.valid).toBe(false);
        expect(result.errors).toEqual([]);
    });

    it('returns valid for passing data', () => {
        const safeParse = (_schema: unknown, _data: unknown) => ({ success: true as const });
        const adapter = new ValibotSchemaAdapter(safeParse);
        const result = adapter.validate({ name: 'Ana' }, {});
        expect(result.valid).toBe(true);
        expect(result.errors).toEqual([]);
    });

    it('returns errors for failing data', () => {
        const safeParse = () => ({
            success: false as const,
            issues: [
                { path: [{ key: 'name' }], message: 'Required' },
                { path: [{ key: 'user' }, { key: 'age' }], message: 'Expected number' },
            ],
        });
        const adapter = new ValibotSchemaAdapter(safeParse);
        const result = adapter.validate({}, {});
        expect(result.valid).toBe(false);
        expect(result.errors).toEqual([
            { path: 'name', message: 'Required' },
            { path: 'user.age', message: 'Expected number' },
        ]);
    });

    it('uses $ when path is empty', () => {
        const safeParse = () => ({
            success: false as const,
            issues: [{ message: 'Invalid input' }],
        });
        const adapter = new ValibotSchemaAdapter(safeParse);
        const result = adapter.validate(null, {});
        expect(result.errors[0].path).toBe('$');
    });
});

describe('YupSchemaAdapter', () => {
    const adapter = new YupSchemaAdapter();

    it('uses $ path for inner errors with no path set', () => {
        const validationError = Object.assign(new Error('invalid'), {
            name: 'ValidationError',
            path: 'root',
            inner: [{ path: '', message: 'field required' }],
        });
        const schema = {
            validateSync: () => {
                throw validationError;
            },
        };
        const result = adapter.validate({}, schema);
        expect(result.errors[0].path).toBe('$');
    });

    it('uses $ for top-level path when err.path is empty', () => {
        const validationError = Object.assign(new Error('bad'), {
            name: 'ValidationError',
            path: '',
            inner: [],
        });
        const schema = {
            validateSync: () => {
                throw validationError;
            },
        };
        const result = adapter.validate({}, schema);
        expect(result.errors[0].path).toBe('$');
    });

    it('falls back to empty inner array when inner is undefined', () => {
        const validationError = Object.assign(new Error('bad'), {
            name: 'ValidationError',
            path: 'field',
            // inner is intentionally NOT set
        });
        const schema = {
            validateSync: () => {
                throw validationError;
            },
        };
        const result = adapter.validate({}, schema);
        expect(result.valid).toBe(false);
        expect(result.errors[0].path).toBe('field');
    });

    it('returns valid for passing data', () => {
        const schema = {
            validateSync: () => ({ name: 'Ana' }),
        };
        const result = adapter.validate({ name: 'Ana' }, schema);
        expect(result.valid).toBe(true);
        expect(result.errors).toEqual([]);
    });

    it('returns errors for failing data', () => {
        const validationError = Object.assign(new Error('Validation failed'), {
            name: 'ValidationError',
            path: '$',
            inner: [
                { path: 'name', message: 'name is required' },
                { path: 'age', message: 'age must be a number' },
            ],
        });
        const schema = {
            validateSync: () => {
                throw validationError;
            },
        };
        const result = adapter.validate({}, schema);
        expect(result.valid).toBe(false);
        expect(result.errors).toEqual([
            { path: 'name', message: 'name is required' },
            { path: 'age', message: 'age must be a number' },
        ]);
    });

    it('handles top-level error when no inner errors', () => {
        const validationError = Object.assign(new Error('name is required'), {
            name: 'ValidationError',
            path: 'name',
            inner: [],
        });
        const schema = {
            validateSync: () => {
                throw validationError;
            },
        };
        const result = adapter.validate({}, schema);
        expect(result.valid).toBe(false);
        expect(result.errors).toEqual([{ path: 'name', message: 'name is required' }]);
    });

    it('re-throws non-ValidationError errors', () => {
        const schema = {
            validateSync: () => {
                throw new TypeError('Something broke');
            },
        };
        expect(() => adapter.validate({}, schema)).toThrow(TypeError);
    });
});

describe('JsonSchemaAdapter', () => {
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
