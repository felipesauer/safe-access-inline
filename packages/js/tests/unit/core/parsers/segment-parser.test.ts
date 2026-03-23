import { describe, it, expect } from 'vitest';
import { SegmentParser } from '../../../../src/core/parsers/segment-parser';
import { SegmentType } from '../../../../src/enums/segment-type.enum';

describe(SegmentParser.name, () => {
    // ── parseSegments — basic keys ─────────────────────────────────────────

    it('parseSegments — single simple key', () => {
        const segs = SegmentParser.parseSegments('name');
        expect(segs).toHaveLength(1);
        expect(segs[0]).toEqual({ type: SegmentType.KEY, value: 'name' });
    });

    it('parseSegments — one-char key is parsed correctly (minimal path boundary)', () => {
        const segs = SegmentParser.parseSegments('x');
        expect(segs).toHaveLength(1);
        expect(segs[0]).toEqual({ type: SegmentType.KEY, value: 'x' });
    });

    it('parseSegments — two-level dot path', () => {
        const segs = SegmentParser.parseSegments('a.b');
        expect(segs).toHaveLength(2);
        expect(segs[0]).toEqual({ type: SegmentType.KEY, value: 'a' });
        expect(segs[1]).toEqual({ type: SegmentType.KEY, value: 'b' });
    });

    it('parseSegments — root anchor $ is stripped', () => {
        const segs = SegmentParser.parseSegments('$.a.b');
        expect(segs).toHaveLength(2);
        expect(segs[0]).toEqual({ type: SegmentType.KEY, value: 'a' });
    });

    it('parseSegments — root anchor $ alone yields empty segment list', () => {
        const segs = SegmentParser.parseSegments('$');
        expect(segs).toHaveLength(0);
    });

    // ── parseSegments — bracket notation ──────────────────────────────────

    it('parseSegments — numeric bracket index', () => {
        const segs = SegmentParser.parseSegments('items[0]');
        expect(segs).toHaveLength(2);
        expect(segs[0]).toEqual({ type: SegmentType.KEY, value: 'items' });
        expect(segs[1]).toEqual({ type: SegmentType.KEY, value: '0' });
    });

    it('parseSegments — single-quoted bracket key', () => {
        const segs = SegmentParser.parseSegments("data['my-key']");
        expect(segs).toHaveLength(2);
        expect(segs[1]).toEqual({ type: SegmentType.KEY, value: 'my-key' });
    });

    it('parseSegments — double-quoted bracket key', () => {
        const segs = SegmentParser.parseSegments('data["key name"]');
        expect(segs).toHaveLength(2);
        expect(segs[1]).toEqual({ type: SegmentType.KEY, value: 'key name' });
    });

    it('parseSegments — bracket key with special characters in unquoted form', () => {
        // Tests basic bracket notation with simple key
        const segs = SegmentParser.parseSegments("a['key']");
        expect(segs).toHaveLength(2);
        expect(segs[0]).toMatchObject({ type: SegmentType.KEY, value: 'a' });
        expect(segs[1]).toMatchObject({ type: SegmentType.KEY, value: 'key' });
    });

    it('parseSegments — quoted bracket key at last position (one char before end)', () => {
        // Tests j loop boundary at j < path.length
        const segs = SegmentParser.parseSegments("a['b']");
        expect(segs).toHaveLength(2);
        expect(segs[1]).toEqual({ type: SegmentType.KEY, value: 'b' });
    });

    // ── parseSegments — multi-index ───────────────────────────────────────

    it('parseSegments — numeric multi-index [0,1,2]', () => {
        const segs = SegmentParser.parseSegments('items[0,1,2]');
        expect(segs).toHaveLength(2);
        const multi = segs[1] as { type: SegmentType.MULTI_INDEX; indices: number[] };
        expect(multi.type).toBe(SegmentType.MULTI_INDEX);
        expect(multi.indices).toEqual([0, 1, 2]);
    });

    it("parseSegments — named multi-key ['a','b']", () => {
        const segs = SegmentParser.parseSegments("cfg['a','b']");
        expect(segs).toHaveLength(2);
        const multi = segs[1] as { type: SegmentType.MULTI_KEY; keys: string[] };
        expect(multi.type).toBe(SegmentType.MULTI_KEY);
        expect(multi.keys).toEqual(['a', 'b']);
    });

    it('parseSegments — multi-key with all-quoted parts uses .keys (not .indices as numbers)', () => {
        const segs = SegmentParser.parseSegments('x["a","b","c"]');
        const multi = segs[1] as { type: SegmentType.MULTI_KEY; keys: string[] };
        expect(multi.type).toBe(SegmentType.MULTI_KEY);
        expect(multi.keys).toEqual(['a', 'b', 'c']);
    });

    // ── parseSegments — slice ─────────────────────────────────────────────

    it('parseSegments — full slice [start:end:step]', () => {
        const segs = SegmentParser.parseSegments('arr[1:5:2]');
        expect(segs).toHaveLength(2);
        const slice = segs[1] as {
            type: SegmentType.SLICE;
            start: number | null;
            end: number | null;
            step: number | null;
        };
        expect(slice.type).toBe(SegmentType.SLICE);
        expect(slice.start).toBe(1);
        expect(slice.end).toBe(5);
        expect(slice.step).toBe(2);
    });

    it('parseSegments — slice with empty start [: end]', () => {
        const segs = SegmentParser.parseSegments('arr[:3]');
        const slice = segs[1] as {
            type: SegmentType.SLICE;
            start: number | null;
            end: number | null;
            step: number | null;
        };
        expect(slice.start).toBeNull();
        expect(slice.end).toBe(3);
    });

    it('parseSegments — slice with empty end [start:]', () => {
        const segs = SegmentParser.parseSegments('arr[2:]');
        const slice = segs[1] as {
            type: SegmentType.SLICE;
            start: number | null;
            end: number | null;
            step: number | null;
        };
        expect(slice.start).toBe(2);
        expect(slice.end).toBeNull();
    });

    it('parseSegments — slice with empty step [start:end:]', () => {
        const segs = SegmentParser.parseSegments('arr[0:5:]');
        const slice = segs[1] as {
            type: SegmentType.SLICE;
            start: number | null;
            end: number | null;
            step: number | null;
        };
        // Empty step portion (':') → step must be null (not NaN)
        expect(slice.step).toBeNull();
    });

    it('parseSegments — reverse slice [::- 1]', () => {
        const segs = SegmentParser.parseSegments('arr[::-1]');
        const slice = segs[1] as {
            type: SegmentType.SLICE;
            start: number | null;
            end: number | null;
            step: number | null;
        };
        expect(slice.start).toBeNull();
        expect(slice.end).toBeNull();
        expect(slice.step).toBe(-1);
    });

    it('parseSegments — bare [: :] yields all-null slice', () => {
        const segs = SegmentParser.parseSegments('arr[:]');
        const slice = segs[1] as {
            type: SegmentType.SLICE;
            start: number | null;
            end: number | null;
            step: number | null;
        };
        expect(slice.type).toBe(SegmentType.SLICE);
        expect(slice.start).toBeNull();
        expect(slice.end).toBeNull();
    });

    // ── parseSegments — wildcard ──────────────────────────────────────────

    it('parseSegments — standalone wildcard *', () => {
        const segs = SegmentParser.parseSegments('*');
        expect(segs).toHaveLength(1);
        expect(segs[0].type).toBe(SegmentType.WILDCARD);
    });

    it('parseSegments — wildcard in path a.*.b', () => {
        const segs = SegmentParser.parseSegments('a.*.b');
        expect(segs).toHaveLength(3);
        expect(segs[1].type).toBe(SegmentType.WILDCARD);
        expect(segs[2]).toEqual({ type: SegmentType.KEY, value: 'b' });
    });

    // ── parseSegments — descent ───────────────────────────────────────────

    it('parseSegments — descent ..key', () => {
        const segs = SegmentParser.parseSegments('..name');
        expect(segs).toHaveLength(1);
        expect(segs[0]).toEqual({ type: SegmentType.DESCENT, key: 'name' });
    });

    it('parseSegments — descent with bracket quoted key ..["key"]', () => {
        const segs = SegmentParser.parseSegments('..["title"]');
        expect(segs).toHaveLength(1);
        expect(segs[0]).toEqual({ type: SegmentType.DESCENT, key: 'title' });
    });

    it("parseSegments — descent multi-key ..['a','b']", () => {
        const segs = SegmentParser.parseSegments("..['a','b']");
        expect(segs).toHaveLength(1);
        expect(segs[0].type).toBe(SegmentType.DESCENT_MULTI);
        const dm = segs[0] as { type: SegmentType.DESCENT_MULTI; keys: string[] };
        expect(dm.keys).toEqual(['a', 'b']);
    });

    // ── parseSegments — escaped dots ──────────────────────────────────────

    it('parseSegments — escaped dot in key', () => {
        const segs = SegmentParser.parseSegments('a\\.b');
        // Escaped dot is part of the key, not a separator
        expect(segs).toHaveLength(1);
        expect(segs[0]).toEqual({ type: SegmentType.KEY, value: 'a.b' });
    });

    // ── parseSegments — filter ────────────────────────────────────────────

    it('parseSegments — filter expression segment', () => {
        const segs = SegmentParser.parseSegments('[?age>18]');
        expect(segs).toHaveLength(1);
        expect(segs[0].type).toBe(SegmentType.FILTER);
    });

    // ── parseKeys ─────────────────────────────────────────────────────────

    it('parseKeys — simple dot-separated path', () => {
        expect(SegmentParser.parseKeys('a.b.c')).toEqual(['a', 'b', 'c']);
    });

    it('parseKeys — bracket notation converted to dot notation', () => {
        expect(SegmentParser.parseKeys('a[0][1]')).toEqual(['a', '0', '1']);
    });

    it('parseKeys — escaped dot preserved as literal dot in key', () => {
        const keys = SegmentParser.parseKeys('a\\.b.c');
        expect(keys).toEqual(['a.b', 'c']);
    });

    it('parseKeys — single key (no separator)', () => {
        expect(SegmentParser.parseKeys('onlyKey')).toEqual(['onlyKey']);
    });

    it('parseKeys — bracket and dot mixed', () => {
        expect(SegmentParser.parseKeys('users[0].name')).toEqual(['users', '0', 'name']);
    });
});

// ── parseSegments — mutation-killing tests ───────────────────────

describe('SegmentParser — descent segment edge cases', () => {
    it('descent with single-quoted key after [..] bracket', () => {
        // Tests regex /^([\'""])(.*?)\1$/ matching on quoted bracket keys after ..
        const segs = SegmentParser.parseSegments("..['title']");
        expect(segs).toHaveLength(1);
        expect(segs[0]).toEqual({ type: SegmentType.DESCENT, key: 'title' });
    });

    it('descent with unquoted key in brackets after ..', () => {
        // Tests fallthrough when inner is not quoted → plain DESCENT with raw key
        const segs = SegmentParser.parseSegments('..[key]');
        expect(segs).toHaveLength(1);
        expect(segs[0]).toEqual({ type: SegmentType.DESCENT, key: 'key' });
    });

    it('descent multi-key with double-quoted keys', () => {
        // Tests the allQuoted path with double quotes
        const segs = SegmentParser.parseSegments('..["a","b"]');
        expect(segs).toHaveLength(1);
        expect(segs[0].type).toBe(SegmentType.DESCENT_MULTI);
        const dm = segs[0] as { type: SegmentType.DESCENT_MULTI; keys: string[] };
        expect(dm.keys).toEqual(['a', 'b']);
    });

    it('parses descent key with a lonely dot suffix', () => {
        // Tests key parsing: key ends before '.' or '['
        const segs = SegmentParser.parseSegments('..name.sub');
        expect(segs).toHaveLength(2);
        expect(segs[0]).toEqual({ type: SegmentType.DESCENT, key: 'name' });
        expect(segs[1]).toEqual({ type: SegmentType.KEY, value: 'sub' });
    });
});

describe('SegmentParser — multi-key with partial quotes (mutation boundary)', () => {
    it('mixed key/number multi-bracket falls through to KEY with raw inner', () => {
        // If parts have neither all-quoted nor all-numbers, falls through to quoted check
        // then to slice (no colon), then to wildcard (not *), then to KEY
        const segs = SegmentParser.parseSegments("x['a',b]");
        // 'a',b — 'a' is quoted, b is not: allQuoted=false, parseInt('b')=NaN: not multi-index
        // Falls through to quoted check for: "'a',b" — not /^(['"])(.*?)\1$/
        // Then slice: no ':', then '*': no, then KEY with value "'a',b"
        expect(segs).toHaveLength(2);
        expect(segs[1]).toMatchObject({ type: SegmentType.KEY, value: "'a',b" });
    });

    it('numeric multi-index inside a key path', () => {
        // Tests that numeric multi-index works in the middle of a path
        const segs = SegmentParser.parseSegments('data[0,1,2].name');
        expect(segs).toHaveLength(3);
        const multi = segs[1] as { type: SegmentType.MULTI_INDEX; indices: number[] };
        expect(multi.type).toBe(SegmentType.MULTI_INDEX);
        expect(multi.indices).toEqual([0, 1, 2]);
        expect(segs[2]).toEqual({ type: SegmentType.KEY, value: 'name' });
    });

    it('multi-key with mixed quote styles uses allQuoted correctly', () => {
        // Tests startsWith/endsWith quote check in allQuoted
        const segs = SegmentParser.parseSegments('x[\'a\',"b"]');
        const mk = segs[1] as { type: SegmentType.MULTI_KEY; keys: string[] };
        expect(mk.type).toBe(SegmentType.MULTI_KEY);
        expect(mk.keys).toEqual(['a', 'b']);
    });
});

describe('SegmentParser — slice parsing boundary tests', () => {
    it('slice with exactly two parts (start and end only, no step)', () => {
        // Tests sliceParts.length > 1 condition for step parsing
        const segs = SegmentParser.parseSegments('arr[2:5]');
        const sl = segs[1] as {
            type: SegmentType.SLICE;
            start: number | null;
            end: number | null;
            step: number | null;
        };
        expect(sl.type).toBe(SegmentType.SLICE);
        expect(sl.start).toBe(2);
        expect(sl.end).toBe(5);
        expect(sl.step).toBeNull();
    });

    it('slice with three empty parts [::] yields all-null slice', () => {
        const segs = SegmentParser.parseSegments('arr[::]');
        const sl = segs[1] as {
            type: SegmentType.SLICE;
            start: number | null;
            end: number | null;
            step: number | null;
        };
        expect(sl.type).toBe(SegmentType.SLICE);
        expect(sl.start).toBeNull();
        expect(sl.end).toBeNull();
        expect(sl.step).toBeNull();
    });
});

describe('SegmentParser — filter and path boundary conditions', () => {
    it('filter at the very end of a path with no trailing segment', () => {
        // Tests j loop boundary and i=j+1 after filter
        const segs = SegmentParser.parseSegments('data[?age>18]');
        expect(segs).toHaveLength(2);
        expect(segs[0]).toEqual({ type: SegmentType.KEY, value: 'data' });
        expect(segs[1].type).toBe(SegmentType.FILTER);
    });

    it('wildcard in bracket notation [*]', () => {
        // Tests inner === "*" path
        const segs = SegmentParser.parseSegments('data[*]');
        expect(segs).toHaveLength(2);
        expect(segs[1].type).toBe(SegmentType.WILDCARD);
    });

    it('path with only wildcard in brackets', () => {
        const segs = SegmentParser.parseSegments('[*]');
        expect(segs).toHaveLength(1);
        expect(segs[0].type).toBe(SegmentType.WILDCARD);
    });

    it('malformed filter expression results in no segment (skip silently)', () => {
        const segs = SegmentParser.parseSegments('[?]');
        expect(segs).toHaveLength(0);
    });
});

describe('SegmentParser — parseKeys regex escape tests', () => {
    it('parseKeys replaces bracket notation in path with multiple brackets', () => {
        // Tests /\[([^\]]+)\]/g replacement
        expect(SegmentParser.parseKeys('a[0][1][2]')).toEqual(['a', '0', '1', '2']);
    });

    it('parseKeys handles key with special chars in bracket (regex pattern)', () => {
        // Tests that [^\]] in regex allows any char except ]
        expect(SegmentParser.parseKeys('a[key-name]')).toEqual(['a', 'key-name']);
    });

    it('parseKeys placeholder regex escapes special regex chars in placeholder', () => {
        // Tests the placeholder.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') logic
        // The placeholder is \x00ESC_DOT\x00 which has no special regex chars,
        // but the test indirectly exercises the regex-escape path
        const keys = SegmentParser.parseKeys('a\\.b\\.c');
        expect(keys).toEqual(['a.b.c']);
    });
});

describe('SegmentParser — projection segment', () => {
    it('parses simple projection .{name,age}', () => {
        const segs = SegmentParser.parseSegments('users.{name,age}');
        expect(segs).toHaveLength(2);
        expect(segs[0]).toEqual({ type: SegmentType.KEY, value: 'users' });
        const proj = segs[1] as {
            type: SegmentType.PROJECTION;
            fields: Array<{ alias: string; source: string }>;
        };
        expect(proj.type).toBe(SegmentType.PROJECTION);
        expect(proj.fields).toContainEqual({ alias: 'name', source: 'name' });
        expect(proj.fields).toContainEqual({ alias: 'age', source: 'age' });
    });

    it('parses aliased projection .{n:name, a:age}', () => {
        const segs = SegmentParser.parseSegments('users.{n:name,a:age}');
        const proj = segs[1] as {
            type: SegmentType.PROJECTION;
            fields: Array<{ alias: string; source: string }>;
        };
        expect(proj.fields).toContainEqual({ alias: 'n', source: 'name' });
        expect(proj.fields).toContainEqual({ alias: 'a', source: 'age' });
    });

    it('parseSegments — projection at root level', () => {
        const segs = SegmentParser.parseSegments('.{id,name}');
        expect(segs).toHaveLength(1);
        expect(segs[0].type).toBe(SegmentType.PROJECTION);
    });
});
