import { describe, it, expectTypeOf } from 'vitest';
import type { DeepPaths, ValueAtPath } from '../../../src/types/deep-paths';
import { SafeAccess } from '../../../src/safe-access';

describe('DeepPaths', () => {
    type Data = {
        name: string;
        age: number;
        user: {
            profile: {
                email: string;
                active: boolean;
            };
            tags: string[];
        };
    };

    it('generates top-level keys', () => {
        type Paths = DeepPaths<Data>;
        expectTypeOf<'name'>().toMatchTypeOf<Paths>();
        expectTypeOf<'age'>().toMatchTypeOf<Paths>();
        expectTypeOf<'user'>().toMatchTypeOf<Paths>();
    });

    it('generates nested paths', () => {
        type Paths = DeepPaths<Data>;
        expectTypeOf<'user.profile'>().toMatchTypeOf<Paths>();
        expectTypeOf<'user.profile.email'>().toMatchTypeOf<Paths>();
        expectTypeOf<'user.profile.active'>().toMatchTypeOf<Paths>();
        expectTypeOf<'user.tags'>().toMatchTypeOf<Paths>();
    });
});

describe('ValueAtPath', () => {
    type Data = {
        name: string;
        age: number;
        user: {
            profile: {
                email: string;
                active: boolean;
            };
            tags: string[];
        };
        items: Array<{ id: number; label: string }>;
    };

    it('resolves top-level types', () => {
        expectTypeOf<ValueAtPath<Data, 'name'>>().toEqualTypeOf<string>();
        expectTypeOf<ValueAtPath<Data, 'age'>>().toEqualTypeOf<number>();
    });

    it('resolves nested types', () => {
        expectTypeOf<ValueAtPath<Data, 'user.profile.email'>>().toEqualTypeOf<string>();
        expectTypeOf<ValueAtPath<Data, 'user.profile.active'>>().toEqualTypeOf<boolean>();
    });

    it('resolves array element type via numeric index', () => {
        expectTypeOf<ValueAtPath<Data, 'user.tags'>>().toEqualTypeOf<string[]>();
    });

    it('resolves unknown for invalid paths', () => {
        expectTypeOf<ValueAtPath<Data, 'nonexistent'>>().toEqualTypeOf<unknown>();
    });
});

describe('AbstractAccessor<T> — typed access', () => {
    type Config = {
        db: {
            host: string;
            port: number;
        };
        debug: boolean;
    };

    it('get() infers correct type for known paths', () => {
        const acc = SafeAccess.fromJson<Config>(
            '{"db":{"host":"localhost","port":5432},"debug":true}',
        );
        expectTypeOf(acc.get('db.host')).toEqualTypeOf<string>();
        expectTypeOf(acc.get('db.port')).toEqualTypeOf<number>();
        expectTypeOf(acc.get('debug')).toEqualTypeOf<boolean>();
    });

    it('set() returns same generic type', () => {
        const acc = SafeAccess.fromJson<Config>(
            '{"db":{"host":"localhost","port":5432},"debug":true}',
        );
        const updated = acc.set('db.host', 'remotehost');
        expectTypeOf(updated.get('db.port')).toEqualTypeOf<number>();
    });

    it('merge() preserves generic type', () => {
        const acc = SafeAccess.fromJson<Config>(
            '{"db":{"host":"localhost","port":5432},"debug":true}',
        );
        const merged = acc.merge('db', { host: 'newhost' });
        expectTypeOf(merged.get('debug')).toEqualTypeOf<boolean>();
    });

    it('untyped accessor returns unknown', () => {
        const acc = SafeAccess.fromJson('{"a":1}');
        expectTypeOf(acc.get('a')).toEqualTypeOf<unknown>();
    });
});
