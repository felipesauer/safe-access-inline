import { describe, it, expect } from 'vitest';
import { ValibotSchemaAdapter } from '../../../src/schema-adapters/valibot.adapter';

describe(ValibotSchemaAdapter.name, () => {
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
