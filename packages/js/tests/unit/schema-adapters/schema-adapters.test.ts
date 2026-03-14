import { describe, it, expect } from 'vitest';
import { ZodSchemaAdapter } from '../../../src/schema-adapters/zod.adapter';
import { ValibotSchemaAdapter } from '../../../src/schema-adapters/valibot.adapter';
import { YupSchemaAdapter } from '../../../src/schema-adapters/yup.adapter';

describe('ZodSchemaAdapter', () => {
    const adapter = new ZodSchemaAdapter();

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
