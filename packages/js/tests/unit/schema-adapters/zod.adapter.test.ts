import { describe, it, expect } from 'vitest';
import { ZodSchemaAdapter } from '../../../src/schema-adapters/zod.adapter';

describe(ZodSchemaAdapter.name, () => {
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
