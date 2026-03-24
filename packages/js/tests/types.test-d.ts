/**
 * @testtype Type-level
 * @description Validates static type inference at build time for the SafeAccess façade.
 *   Failures here indicate a regression in DX — the user would receive `unknown`
 *   where they expected a concrete type.
 *   Run: npx vitest typecheck
 */

import { describe, it, expectTypeOf } from 'vitest';
import { SafeAccess } from '../src/safe-access';
import { JsonAccessor } from '../src/accessors/json.accessor';
import { ArrayAccessor } from '../src/accessors/array.accessor';
import { ObjectAccessor } from '../src/accessors/object.accessor';
import { XmlAccessor } from '../src/accessors/xml.accessor';

describe('SafeAccess façade type inference', () => {
    // Factory overloads must return the correct accessor subtype
    it('from() with format hint returns specific accessor type', () => {
        expectTypeOf(SafeAccess.from('{}', 'json')).toEqualTypeOf<JsonAccessor>();
        expectTypeOf(SafeAccess.from([], 'array')).toEqualTypeOf<ArrayAccessor>();
        expectTypeOf(SafeAccess.from({}, 'object')).toEqualTypeOf<ObjectAccessor>();
        expectTypeOf(SafeAccess.from('<r/>', 'xml')).toEqualTypeOf<XmlAccessor>();
    });

    // Without format, from() returns the base AbstractAccessor
    it('from() without format returns AbstractAccessor', () => {
        const acc = SafeAccess.from('{}');
        expectTypeOf(acc.get).toBeFunction();
    });

    // Typed generic accessor preserves value types on get()
    it('fromJson<T>() infers value types from generic', () => {
        type Schema = { user: { name: string; age: number }; active: boolean };
        const acc = SafeAccess.fromJson<Schema>('{"user":{"name":"A","age":1},"active":true}');
        expectTypeOf(acc.get('user.name')).toEqualTypeOf<string>();
        expectTypeOf(acc.get('user.age')).toEqualTypeOf<number>();
        expectTypeOf(acc.get('active')).toEqualTypeOf<boolean>();
    });

    // Untyped accessor returns unknown — user must narrow manually
    it('untyped fromJson() returns unknown from get()', () => {
        const acc = SafeAccess.fromJson('{"a":1}');
        expectTypeOf(acc.get('a')).toEqualTypeOf<unknown>();
    });

    // fromObject with generic preserves type through set()
    it('fromObject<T>() preserves generic through set()', () => {
        type Cfg = { host: string; port: number };
        const acc = SafeAccess.fromObject<Cfg>({ host: 'localhost', port: 3000 });
        const updated = acc.set('host', 'remote');
        expectTypeOf(updated.get('port')).toEqualTypeOf<number>();
    });
});
