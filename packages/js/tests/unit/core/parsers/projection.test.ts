import { describe, it, expect } from 'vitest';
import { SegmentParser } from '../../../../src/core/parsers/segment-parser';
import { DotNotationParser } from '../../../../src/core/parsers/dot-notation-parser';
import { SegmentType } from '../../../../src/enums/segment-type.enum';

describe('Projection', () => {
    // ── SegmentParser ────────────────────────────────────────────────────────

    describe(SegmentParser.name, () => {
        it('parses {name, age} as PROJECTION segment with two same-name fields', () => {
            const segs = SegmentParser.parseSegments('users[*].{name, age}');
            expect(segs).toHaveLength(3);
            expect(segs[2]).toEqual({
                type: SegmentType.PROJECTION,
                fields: [
                    { alias: 'name', source: 'name' },
                    { alias: 'age', source: 'age' },
                ],
            });
        });

        it('parses {fullName: name, yr: age} as PROJECTION with aliased fields', () => {
            const segs = SegmentParser.parseSegments('users[*].{fullName: name, yr: age}');
            expect(segs).toHaveLength(3);
            expect(segs[2]).toEqual({
                type: SegmentType.PROJECTION,
                fields: [
                    { alias: 'fullName', source: 'name' },
                    { alias: 'yr', source: 'age' },
                ],
            });
        });

        it('parses single-field projection {id}', () => {
            const segs = SegmentParser.parseSegments('items.{id}');
            expect(segs).toHaveLength(2);
            expect(segs[1]).toEqual({
                type: SegmentType.PROJECTION,
                fields: [{ alias: 'id', source: 'id' }],
            });
        });
    });

    // ── PathResolver (via DotNotationParser) ─────────────────────────────────

    describe('PathResolver', () => {
        const data = {
            users: [
                { name: 'Ana', age: 30, email: 'ana@example.com', role: 'admin' },
                { name: 'Bob', age: 25, email: 'bob@example.com', role: 'user' },
                { name: 'Lia', age: 35, email: 'lia@example.com', role: 'admin' },
            ],
        };

        it('projects named fields from wildcard', () => {
            const result = DotNotationParser.get(data, 'users[*].{name, age}');
            expect(result).toEqual([
                { name: 'Ana', age: 30 },
                { name: 'Bob', age: 25 },
                { name: 'Lia', age: 35 },
            ]);
        });

        it('supports field renaming via alias:field', () => {
            const result = DotNotationParser.get(data, 'users[*].{fullName: name, yr: age}');
            expect(result).toEqual([
                { fullName: 'Ana', yr: 30 },
                { fullName: 'Bob', yr: 25 },
                { fullName: 'Lia', yr: 35 },
            ]);
        });

        it('returns null for missing fields in projection', () => {
            const result = DotNotationParser.get(data, 'users[*].{name, nonExistent}');
            expect(result).toEqual([
                { name: 'Ana', nonExistent: null },
                { name: 'Bob', nonExistent: null },
                { name: 'Lia', nonExistent: null },
            ]);
        });

        it('projects from filter result (wildcards + filter)', () => {
            const result = DotNotationParser.get(data, 'users[?role==admin].{name, email}');
            expect(result).toEqual([
                { name: 'Ana', email: 'ana@example.com' },
                { name: 'Lia', email: 'lia@example.com' },
            ]);
        });

        it('projects single object (no wildcard)', () => {
            const singleData = { user: { name: 'Ana', age: 30, email: 'ana@example.com' } };
            const result = DotNotationParser.get(singleData, 'user.{name, age}');
            expect(result).toEqual({ name: 'Ana', age: 30 });
        });

        it('projects with mixed alias and non-alias fields', () => {
            const result = DotNotationParser.get(data, 'users[*].{id: name, age}');
            expect(result).toEqual([
                { id: 'Ana', age: 30 },
                { id: 'Bob', age: 25 },
                { id: 'Lia', age: 35 },
            ]);
        });

        it('returns defaultValue when applied to non-object/non-array', () => {
            const result = DotNotationParser.get({ count: 42 }, 'count.{id}', 'fallback');
            expect(result).toBe('fallback');
        });
    });
});
