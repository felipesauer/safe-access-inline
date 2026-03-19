import { describe, it, expect } from 'vitest';
import { YupSchemaAdapter } from '../../../src/schema-adapters/yup.adapter';

describe(YupSchemaAdapter.name, () => {
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
