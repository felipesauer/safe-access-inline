import { describe, it, expect, afterEach } from 'vitest';
import { SafeAccess } from '../../src/safe-access';
import { CompiledPath } from '../../src/types/compiled-path';
import { ObjectAccessor } from '../../src/accessors/object.accessor';

afterEach(() => {
    SafeAccess.resetAll();
});

describe(CompiledPath.name, () => {
    it('SafeAccess.compilePath — returns a CompiledPath instance', () => {
        expect(SafeAccess.compilePath('user.name')).toBeInstanceOf(CompiledPath);
    });

    it('SafeAccess.compilePath — compiled path has internal segments array', () => {
        const compiled = SafeAccess.compilePath('user.name');
        expect(Array.isArray(compiled._segments)).toBe(true);
        expect(compiled._segments.length).toBe(2);
    });

    it('getCompiled — resolves value at pre-compiled path', () => {
        const compiled = SafeAccess.compilePath('user.name');
        const accessor = ObjectAccessor.from({ user: { name: 'Ana' } });
        expect(accessor.getCompiled(compiled)).toBe('Ana');
    });

    it('getCompiled — returns null by default when path is missing', () => {
        const compiled = SafeAccess.compilePath('user.name');
        expect(ObjectAccessor.from({}).getCompiled(compiled)).toBeNull();
    });

    it('getCompiled — returns provided defaultValue when path is missing', () => {
        const compiled = SafeAccess.compilePath('user.name');
        expect(ObjectAccessor.from({}).getCompiled(compiled, 'N/A')).toBe('N/A');
    });

    it('getCompiled — same compiled path works correctly across multiple accessors', () => {
        const compiled = SafeAccess.compilePath('name');
        const a1 = ObjectAccessor.from({ name: 'Ana' });
        const a2 = ObjectAccessor.from({ name: 'Bob' });
        expect(a1.getCompiled(compiled)).toBe('Ana');
        expect(a2.getCompiled(compiled)).toBe('Bob');
    });

    it('getCompiled — supports nested paths', () => {
        const compiled = SafeAccess.compilePath('a.b.c');
        expect(ObjectAccessor.from({ a: { b: { c: 42 } } }).getCompiled(compiled)).toBe(42);
    });

    it('getCompiled — supports wildcard paths', () => {
        const compiled = SafeAccess.compilePath('items.*.label');
        const accessor = ObjectAccessor.from({ items: [{ label: 'x' }, { label: 'y' }] });
        expect(accessor.getCompiled(compiled)).toEqual(['x', 'y']);
    });

    it('getCompiled — returns defaultValue for scalar at non-leaf segment', () => {
        const compiled = SafeAccess.compilePath('x.y.z');
        expect(ObjectAccessor.from({ x: 'scalar' }).getCompiled(compiled, 'default')).toBe(
            'default',
        );
    });
});
