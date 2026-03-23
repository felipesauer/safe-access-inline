import { describe, it, expect } from 'vitest';
import { AbstractAccessor } from '../../../src/core/abstract-accessor';
import { ObjectAccessor } from '../../../src/accessors/object.accessor';

describe(AbstractAccessor.name, () => {
    describe('getTemplate — @path bindings', () => {
        it('resolves @path binding to a string value from data', () => {
            const accessor = ObjectAccessor.from({
                key: 'name',
                user: { name: 'Ana', age: 25 },
            });
            expect(accessor.getTemplate('user.{field}', { field: '@key' })).toBe('Ana');
        });

        it('resolves @path binding that returns a number', () => {
            const accessor = ObjectAccessor.from({
                idx: 1,
                items: [{ label: 'zero' }, { label: 'one' }],
            });
            expect(accessor.getTemplate('items.{i}.label', { i: '@idx' })).toBe('one');
        });

        it('resolves nested @path binding', () => {
            const accessor = ObjectAccessor.from({
                meta: { userId: '42' },
                users: { '42': { name: 'Bob' } },
            });
            expect(accessor.getTemplate('users.{id}.name', { id: '@meta.userId' })).toBe('Bob');
        });

        it('returns defaultValue when @path binding resolves to null', () => {
            const accessor = ObjectAccessor.from({ user: { name: 'Ana' } });
            expect(accessor.getTemplate('user.{field}', { field: '@missing' }, 'fallback')).toBe(
                'fallback',
            );
        });

        it('non-@ bindings pass through unchanged', () => {
            const accessor = ObjectAccessor.from({ users: { 1: { name: 'Bob' } } });
            expect(accessor.getTemplate('users.{id}.name', { id: 1 })).toBe('Bob');
        });

        it('mixed @path and literal bindings resolve correctly', () => {
            const accessor = ObjectAccessor.from({
                section: 'db',
                config: { db: { host: 'localhost' } },
            });
            expect(accessor.getTemplate('config.{s}.{f}', { s: '@section', f: 'host' })).toBe(
                'localhost',
            );
        });

        it('returns null by default when @path resolves to null and no defaultValue given', () => {
            const accessor = ObjectAccessor.from({});
            expect(accessor.getTemplate('a.{k}', { k: '@missing' })).toBeNull();
        });
    });
});
