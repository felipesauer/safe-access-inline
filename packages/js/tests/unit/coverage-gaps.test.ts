/**
 * Tests for coverage gaps across multiple modules.
 * Each section targets specific uncovered lines/branches.
 */
import { describe, it, expect, vi, afterEach } from 'vitest';
import * as fs from 'node:fs';
import * as path from 'node:path';
import * as os from 'node:os';
import { SafeAccess } from '../../src/safe-access';
import { diff, applyPatch, type JsonPatchOp } from '../../src/core/json-patch';
import { mask } from '../../src/core/data-masker';
import { sanitizeCsvCell } from '../../src/core/csv-sanitizer';
import { TypeDetector } from '../../src/core/type-detector';
import { XmlAccessor } from '../../src/accessors/xml.accessor';
import { optionalRequire } from '../../src/core/optional-require';
import { PathCache } from '../../src/core/path-cache';
import { PluginRegistry } from '../../src/core/plugin-registry';

// ── SafeAccess.from() with custom accessor via extend ──────────
describe('SafeAccess — custom accessor through from()', () => {
    afterEach(() => {
        // Clean up registered custom accessors
    });

    it('from() routes to registered custom accessor', () => {
        SafeAccess.extend(
            'my_custom',
            class {
                data: Record<string, unknown>;
                constructor(data: unknown) {
                    this.data = data as Record<string, unknown>;
                }
                get(key: string) {
                    return (this.data as Record<string, unknown>)[key];
                }
            } as unknown as new (
                data: unknown,
            ) => InstanceType<typeof import('../../src/core/abstract-accessor').AbstractAccessor>,
        );
        const accessor = SafeAccess.from({ x: 42 }, 'my_custom');
        expect(accessor.get('x')).toBe(42);
    });
});

// ── SafeAccess.fromFileSync auto-detect (no extension) ─────────
describe('SafeAccess — fromFileSync auto-detect', () => {
    it('auto-detects format when file has no recognizable extension', () => {
        const tmpFile = path.join(os.tmpdir(), `sa-test-${Date.now()}.dat`);
        fs.writeFileSync(tmpFile, '{"auto":"detected"}');
        try {
            const acc = SafeAccess.fromFileSync(tmpFile, { allowAnyPath: true });
            expect(acc.get('auto')).toBe('detected');
        } finally {
            fs.unlinkSync(tmpFile);
        }
    });
});

// ── SafeAccess.fromFile auto-detect (no extension) ─────────
describe('SafeAccess — fromFile auto-detect', () => {
    it('auto-detects format when file has no recognizable extension', async () => {
        const tmpFile = path.join(os.tmpdir(), `sa-test-${Date.now()}.dat`);
        fs.writeFileSync(tmpFile, '{"async_auto":"detected"}');
        try {
            const acc = await SafeAccess.fromFile(tmpFile, { allowAnyPath: true });
            expect(acc.get('async_auto')).toBe('detected');
        } finally {
            fs.unlinkSync(tmpFile);
        }
    });
});

// ── SafeAccess.fromUrl ──────────────────────────────────────────
describe('SafeAccess — fromUrl', () => {
    afterEach(() => {
        vi.restoreAllMocks();
    });

    it('fetches URL and parses with explicit format', async () => {
        vi.stubGlobal(
            'fetch',
            vi.fn().mockResolvedValue({
                ok: true,
                text: () => Promise.resolve('{"url":"data"}'),
            }),
        );
        const acc = await SafeAccess.fromUrl('https://example.com/data.json', { format: 'json' });
        expect(acc.get('url')).toBe('data');
    });

    it('fetches URL and detects format from URL path', async () => {
        vi.stubGlobal(
            'fetch',
            vi.fn().mockResolvedValue({
                ok: true,
                text: () => Promise.resolve('{"detected":"yes"}'),
            }),
        );
        const acc = await SafeAccess.fromUrl('https://example.com/config.json');
        expect(acc.get('detected')).toBe('yes');
    });

    it('fetches URL and auto-detects when no format hint', async () => {
        vi.stubGlobal(
            'fetch',
            vi.fn().mockResolvedValue({
                ok: true,
                text: () => Promise.resolve('{"auto":"yes"}'),
            }),
        );
        const acc = await SafeAccess.fromUrl('https://example.com/data');
        expect(acc.get('auto')).toBe('yes');
    });

    it('throws on HTTP error', async () => {
        vi.stubGlobal(
            'fetch',
            vi.fn().mockResolvedValue({
                ok: false,
                status: 404,
                text: () => Promise.resolve('Not Found'),
            }),
        );
        await expect(SafeAccess.fromUrl('https://example.com/missing.json')).rejects.toThrow(
            'Failed to fetch URL',
        );
    });
});

// ── SafeAccess.watchFile ────────────────────────────────────────
describe('SafeAccess — watchFile', () => {
    it('calls onChange with accessor when file changes', async () => {
        const tmpFile = path.join(os.tmpdir(), `sa-watch-${Date.now()}.json`);
        fs.writeFileSync(tmpFile, '{"v":1}');

        const onChange = vi.fn();
        const unsub = SafeAccess.watchFile(tmpFile, onChange, { allowAnyPath: true });

        fs.writeFileSync(tmpFile, '{"v":2}');
        await new Promise((r) => setTimeout(r, 300));

        expect(onChange).toHaveBeenCalled();
        const acc = onChange.mock.calls[0][0];
        expect(acc.get('v')).toBe(2);

        unsub();
        fs.unlinkSync(tmpFile);
    });
});

// ── JSON Patch — array diffing edge cases ───────────────────────
describe('JSON Patch — array edge cases', () => {
    it('diff detects added array elements', () => {
        const ops = diff({ items: [1] }, { items: [1, 2, 3] });
        expect(ops).toContainEqual({ op: 'add', path: '/items/1', value: 2 });
        expect(ops).toContainEqual({ op: 'add', path: '/items/2', value: 3 });
    });

    it('diff detects removed array elements', () => {
        const ops = diff({ items: [1, 2, 3] }, { items: [1] });
        const removeOps = ops.filter((o) => o.op === 'remove');
        expect(removeOps.length).toBeGreaterThan(0);
    });

    it('diff handles nested object changes inside arrays', () => {
        const a = {
            items: [
                { name: 'a', val: 1 },
                { name: 'b', val: 2 },
            ],
        };
        const b = {
            items: [
                { name: 'a', val: 1 },
                { name: 'b', val: 99 },
            ],
        };
        const ops = diff(a, b);
        expect(ops).toContainEqual({ op: 'replace', path: '/items/1/val', value: 99 });
    });

    it('diff handles array to different type', () => {
        const a = { items: [1, 2] };
        const b = { items: [1, 'two'] };
        const ops = diff(a, b);
        expect(ops).toContainEqual({ op: 'replace', path: '/items/1', value: 'two' });
    });

    it('applyPatch — add to array with - (append)', () => {
        const result = applyPatch({ items: [1, 2] }, [{ op: 'add', path: '/items/-', value: 3 }]);
        expect(result.items).toEqual([1, 2, 3]);
    });

    it('applyPatch — remove from array by index', () => {
        const result = applyPatch({ items: [1, 2, 3] }, [{ op: 'remove', path: '/items/1' }]);
        expect(result.items).toEqual([1, 3]);
    });

    it('applyPatch — replace in array by index', () => {
        const result = applyPatch({ items: [1, 2, 3] }, [
            { op: 'replace', path: '/items/1', value: 99 },
        ]);
        expect(result.items).toEqual([1, 99, 3]);
    });

    it('applyPatch — move within nested', () => {
        const result = applyPatch({ a: { x: 1 }, b: {} }, [
            { op: 'move', from: '/a/x', path: '/b/y' },
        ]);
        expect(result).toEqual({ a: {}, b: { y: 1 } });
    });

    it('applyPatch — copy nested', () => {
        const result = applyPatch({ a: { x: [1, 2] } }, [{ op: 'copy', from: '/a/x', path: '/b' }]);
        expect(result).toEqual({ a: { x: [1, 2] }, b: [1, 2] });
    });

    it('applyPatch — test passes for equal nested objects', () => {
        const ops: JsonPatchOp[] = [{ op: 'test', path: '/a', value: { x: 1 } }];
        expect(() => applyPatch({ a: { x: 1 } }, ops)).not.toThrow();
    });

    it('applyPatch — test fails for non-equal nested objects', () => {
        const ops: JsonPatchOp[] = [{ op: 'test', path: '/a', value: { x: 2 } }];
        expect(() => applyPatch({ a: { x: 1 } }, ops)).toThrow('Test operation failed');
    });

    it('diff — null values compared', () => {
        const ops = diff({ a: null } as Record<string, unknown>, { a: 1 });
        expect(ops).toContainEqual({ op: 'replace', path: '/a', value: 1 });
    });

    it('diff — different types at same key', () => {
        const ops = diff(
            { a: 'str' } as Record<string, unknown>,
            { a: [1, 2] } as Record<string, unknown>,
        );
        expect(ops).toContainEqual({ op: 'replace', path: '/a', value: [1, 2] });
    });

    it('diff — array with objects with different keys', () => {
        const a = { items: [{ x: 1 }] };
        const b = { items: [{ x: 1, y: 2 }] };
        const ops = diff(a, b);
        expect(ops).toContainEqual({ op: 'add', path: '/items/0/y', value: 2 });
    });

    it('getAtPointer returns undefined for non-existent path', () => {
        const ops: JsonPatchOp[] = [{ op: 'copy', from: '/nonexistent', path: '/b' }];
        const result = applyPatch({ a: 1 }, ops);
        expect(result.b).toBeUndefined();
    });

    it('diff — deep equality with arrays of different lengths', () => {
        const a = { a: [1, 2, 3] };
        const b = { a: [1, 2] };
        const ops = diff(a, b);
        expect(ops.some((o) => o.op === 'remove')).toBe(true);
    });

    it('parsePointer handles empty pointer', () => {
        const result = applyPatch({ a: 1 }, [{ op: 'replace', path: '', value: { b: 2 } }]);
        expect(result).toEqual({ b: 2 });
    });

    it('setAtPointer to nested array element', () => {
        const result = applyPatch({ items: [{ a: 1 }, { a: 2 }] }, [
            { op: 'replace', path: '/items/0/a', value: 99 },
        ]);
        expect(result.items).toEqual([{ a: 99 }, { a: 2 }]);
    });

    it('getAtPointer traverses array', () => {
        const ops: JsonPatchOp[] = [{ op: 'copy', from: '/items/1', path: '/copied' }];
        const result = applyPatch({ items: ['a', 'b', 'c'] }, ops);
        expect(result.copied).toBe('b');
    });

    it('getAtPointer on primitive returns undefined', () => {
        const ops: JsonPatchOp[] = [{ op: 'copy', from: '/a/deep', path: '/b' }];
        const result = applyPatch({ a: 42 } as Record<string, unknown>, ops);
        expect(result.b).toBeUndefined();
    });

    it('removeAtPointer from array', () => {
        const result = applyPatch({ items: ['a', 'b', 'c'] }, [{ op: 'remove', path: '/items/0' }]);
        expect(result.items).toEqual(['b', 'c']);
    });

    it('removeAtPointer empty pointer returns empty object', () => {
        const result = applyPatch({ a: 1, b: 2 }, [{ op: 'remove', path: '' }]);
        expect(result).toEqual({});
    });

    it('add with undefined value at root falls back to empty object', () => {
        const result = applyPatch({ a: 1 }, [{ op: 'add', path: '', value: undefined }]);
        expect(result).toEqual({});
    });

    it('move to root replaces entire document', () => {
        const result = applyPatch({ a: 1, b: { x: 2 } }, [{ op: 'move', from: '/b', path: '' }]);
        expect(result).toEqual({ x: 2 });
    });

    it('move from root clears document and sets target', () => {
        const result = applyPatch({ a: 1, b: 2 }, [{ op: 'move', from: '', path: '/nested' }]);
        expect(result).toEqual({ nested: { a: 1, b: 2 } });
    });

    it('copy to root replaces entire document', () => {
        const result = applyPatch({ src: { x: 1 }, other: 2 }, [
            { op: 'copy', from: '/src', path: '' },
        ]);
        expect(result).toEqual({ x: 1 });
    });

    it('diff with deeply nested arrays of objects', () => {
        const a = { deep: { arr: [{ id: 1 }, { id: 2 }] } };
        const b = { deep: { arr: [{ id: 1 }, { id: 3 }] } };
        const ops = diff(a, b);
        expect(ops).toContainEqual({ op: 'replace', path: '/deep/arr/1/id', value: 3 });
    });

    it('parsePointer with escaped characters', () => {
        const result = applyPatch({ 'a/b': 1, 'c~d': 2 }, [
            { op: 'replace', path: '/a~1b', value: 99 },
        ]);
        expect(result['a/b']).toBe(99);
    });
});

// ── Data Masker — depth limit ───────────────────────────────────
describe('DataMasker — edge cases', () => {
    it('stops recursion at depth > 100', () => {
        // Build object with 110 levels of nesting
        let obj: Record<string, unknown> = { password: 'secret' };
        for (let i = 0; i < 110; i++) {
            obj = { nested: obj };
        }
        const result = mask(obj);
        // The deeply nested password should NOT be masked (depth limit reached)
        let current: Record<string, unknown> = result;
        for (let i = 0; i < 110; i++) {
            current = current.nested as Record<string, unknown>;
        }
        expect(current.password).toBe('secret');
    });

    it('masks keys inside array items', () => {
        const data = { items: [{ password: 'abc' }, { name: 'ok' }] };
        const result = mask(data);
        expect((result.items as Record<string, unknown>[])[0].password).toBe('[REDACTED]');
        expect((result.items as Record<string, unknown>[])[1].name).toBe('ok');
    });
});

// ── CSV Sanitizer — default branch ──────────────────────────────
describe('CsvSanitizer — edge cases', () => {
    it('returns cell unchanged for unknown mode', () => {
        // The default case in switch returns cell as-is
        expect(sanitizeCsvCell('=test', 'unknown' as 'prefix')).toBe('=test');
    });
});

// ── TypeDetector — NDJSON fallback ──────────────────────────────
describe('TypeDetector — NDJSON fallback', () => {
    it('detects NDJSON when JSON parse fails but lines are objects', () => {
        // String that starts with { but is invalid JSON, yet each line is a JSON object
        const ndjson = '{"a":1}\n{"b":2}';
        // This should be detected as NDJSON (since it's valid JSON only per-line)
        const acc = TypeDetector.resolve(ndjson);
        // The NDJSON accessor would parse this as array of objects
        expect(acc.all()).toBeTruthy();
    });

    it('falls through when invalid JSON with non-object lines', () => {
        const data = '{invalid json\nstill broken';
        expect(() => TypeDetector.resolve(data)).toThrow();
    });
});

// ── XmlAccessor — clone and getOriginalXml ──────────────────────
describe('XmlAccessor — clone and getOriginalXml', () => {
    it('clone creates new instance with modified data', () => {
        const xml = '<root><name>Ana</name></root>';
        const acc = XmlAccessor.from(xml);
        const modified = acc.set('name', 'Bob');
        expect(modified.get('name')).toBe('Bob');
        expect(acc.get('name')).toBe('Ana');
    });

    it('getOriginalXml returns the original XML string', () => {
        const xml = '<root><name>Ana</name></root>';
        const acc = XmlAccessor.from(xml) as XmlAccessor;
        expect(acc.getOriginalXml()).toBe(xml);
    });

    it('getOriginalXml persists after set operations', () => {
        const xml = '<root><val>1</val></root>';
        const acc = XmlAccessor.from(xml) as XmlAccessor;
        const modified = acc.set('val', '2') as XmlAccessor;
        expect(modified.getOriginalXml()).toBe(xml);
    });
});

// ── AbstractAccessor — unique with key, sortAt with key ─────────
describe('AbstractAccessor — array operations with key', () => {
    it('unique(path, key) deduplicates by key field', () => {
        const acc = SafeAccess.fromJson(
            JSON.stringify({
                items: [
                    { id: 1, name: 'a' },
                    { id: 2, name: 'b' },
                    { id: 1, name: 'c' },
                ],
            }),
        );
        const result = acc.unique('items', 'id');
        expect(result.get('items')).toEqual([
            { id: 1, name: 'a' },
            { id: 2, name: 'b' },
        ]);
    });

    it('sortAt with key sorts by object property', () => {
        const acc = SafeAccess.fromJson(
            JSON.stringify({
                items: [
                    { name: 'Charlie', age: 30 },
                    { name: 'Alice', age: 25 },
                    { name: 'Bob', age: 35 },
                ],
            }),
        );
        const result = acc.sortAt('items', 'name', 'asc');
        const items = result.get('items') as Record<string, unknown>[];
        expect(items[0].name).toBe('Alice');
        expect(items[1].name).toBe('Bob');
        expect(items[2].name).toBe('Charlie');
    });

    it('sortAt with key handles null/undefined values', () => {
        const acc = SafeAccess.fromJson(
            JSON.stringify({
                items: [
                    { name: 'Bob', val: 2 },
                    { name: 'Alice', val: null },
                    { name: 'Charlie', val: 1 },
                ],
            }),
        );
        const result = acc.sortAt('items', 'val', 'asc');
        const items = result.get('items') as Record<string, unknown>[];
        // null values sorted to end in asc
        expect(items[items.length - 1].val).toBeNull();
    });

    it('sortAt desc with key', () => {
        const acc = SafeAccess.fromJson(
            JSON.stringify({
                items: [{ v: 1 }, { v: 3 }, { v: 2 }],
            }),
        );
        const result = acc.sortAt('items', 'v', 'desc');
        const items = result.get('items') as Record<string, unknown>[];
        expect(items[0].v).toBe(3);
        expect(items[1].v).toBe(2);
        expect(items[2].v).toBe(1);
    });
});

// ── FileWatcher — rapid changes debounce ────────────────────────
describe('FileWatcher — debounce on rapid changes', () => {
    it('debounces rapid file changes', async () => {
        const tmpFile = path.join(os.tmpdir(), `fw-rapid-${Date.now()}.txt`);
        fs.writeFileSync(tmpFile, 'v1');

        const { watchFile } = await import('../../src/core/file-watcher');
        const onChange = vi.fn();
        const unsub = watchFile(tmpFile, onChange);

        // Rapid successive writes to trigger debounce timer reset
        fs.writeFileSync(tmpFile, 'v2');
        await new Promise((r) => setTimeout(r, 30));
        fs.writeFileSync(tmpFile, 'v3');
        await new Promise((r) => setTimeout(r, 30));
        fs.writeFileSync(tmpFile, 'v4');

        // Wait for debounce to settle
        await new Promise((r) => setTimeout(r, 300));

        // Should have been called (debounced to fewer calls than writes)
        expect(onChange).toHaveBeenCalled();

        unsub();
        fs.unlinkSync(tmpFile);
    });
});

// ── IP Range Checker — edge branches ────────────────────────────
describe('IpRangeChecker — edge branches', () => {
    it('handles edge case IP ranges', async () => {
        const { isPrivateIp } = await import('../../src/core/ip-range-checker');
        // These cover the range comparison branches
        expect(isPrivateIp('10.0.0.1')).toBe(true);
        expect(isPrivateIp('172.16.0.1')).toBe(true);
        expect(isPrivateIp('172.31.255.255')).toBe(true);
        expect(isPrivateIp('172.32.0.1')).toBe(false);
        expect(isPrivateIp('192.168.0.1')).toBe(true);
        expect(isPrivateIp('8.8.8.8')).toBe(false);
        expect(isPrivateIp('127.0.0.1')).toBe(true);
        expect(isPrivateIp('169.254.0.1')).toBe(true);
    });
});

// ── SecurityOptions — assertions ────────────────────────────────
describe('SecurityOptions — assertions', () => {
    it('assertPayloadSize passes for small input', async () => {
        const { assertPayloadSize } = await import('../../src/core/security-options');
        expect(() => assertPayloadSize('small')).not.toThrow();
    });

    it('assertPayloadSize throws for oversized input', async () => {
        const { assertPayloadSize } = await import('../../src/core/security-options');
        expect(() => assertPayloadSize('x'.repeat(100), 10)).toThrow('Payload size');
    });

    it('assertMaxKeys throws for excessive keys', async () => {
        const { assertMaxKeys } = await import('../../src/core/security-options');
        const data: Record<string, unknown> = {};
        for (let i = 0; i < 15; i++) data[`k${i}`] = i;
        expect(() => assertMaxKeys(data, 5)).toThrow('exceeding maximum');
    });

    it('countKeys handles depth > 100', async () => {
        const { assertMaxKeys } = await import('../../src/core/security-options');
        let obj: Record<string, unknown> = { leaf: 1 };
        for (let i = 0; i < 110; i++) obj = { n: obj };
        // Should not throw — deep nesting stops counting at 100
        expect(() => assertMaxKeys(obj, 10000)).not.toThrow();
    });
});

// ── PathCache — cache eviction ──────────────────────────────────
describe('PathCache — eviction', () => {
    it('evicts oldest entry when cache is full', async () => {
        const { PathCache } = await import('../../src/core/path-cache');
        PathCache.clear();
        // Fill cache to max (1000)
        for (let i = 0; i < 1001; i++) {
            PathCache.set(`path.${i}`, [{ type: 'key' as const, value: String(i) }]);
        }
        // First entry should have been evicted
        expect(PathCache.has('path.0')).toBe(false);
        // Last entry should still be there
        expect(PathCache.has('path.1000')).toBe(true);
        PathCache.clear();
    });
});

// ── IO Loader — fetchUrl HTTP error ─────────────────────────────
describe('IO Loader — fetchUrl', () => {
    afterEach(() => {
        vi.restoreAllMocks();
    });

    it('throws SecurityError on non-OK response', async () => {
        const { fetchUrl } = await import('../../src/core/io-loader');
        vi.stubGlobal(
            'fetch',
            vi.fn().mockResolvedValue({
                ok: false,
                status: 500,
                text: () => Promise.resolve('Server Error'),
            }),
        );
        await expect(fetchUrl('https://example.com/api')).rejects.toThrow('Failed to fetch URL');
    });

    it('returns text on success', async () => {
        const { fetchUrl } = await import('../../src/core/io-loader');
        vi.stubGlobal(
            'fetch',
            vi.fn().mockResolvedValue({
                ok: true,
                text: () => Promise.resolve('response data'),
            }),
        );
        const result = await fetchUrl('https://example.com/api');
        expect(result).toBe('response data');
    });
});

// ── XmlAccessor — non-SecurityError parse failure ───────────────
describe('XmlAccessor — parse errors', () => {
    it('wraps non-SecurityError parse failure as InvalidFormatError', () => {
        // XML that passes XXE checks (no DOCTYPE/ENTITY) but has invalid structure
        expect(() => new XmlAccessor('just plain text without tags')).toThrow(
            'XmlAccessor failed to parse XML string.',
        );
    });

    it('rejects XML with ENTITY declaration', () => {
        const xmlWithEntity = '<!ENTITY foo "bar"><root><a>1</a></root>';
        expect(() => new XmlAccessor(xmlWithEntity)).toThrow('XML ENTITY declarations are blocked');
    });
});

// ── AbstractAccessor — last() on empty / getArrayOrEmpty on non-array ──
describe('AbstractAccessor — last/first edge cases', () => {
    it('last() on empty array returns defaultValue', () => {
        const acc = SafeAccess.fromJson('{"items":[]}');
        expect(acc.last('items')).toBeNull();
        expect(acc.last('items', 'fallback')).toBe('fallback');
    });

    it('last() on non-array path returns defaultValue (getArrayOrEmpty returns [])', () => {
        const acc = SafeAccess.fromJson('{"items":"not-an-array"}');
        expect(acc.last('items')).toBeNull();
        expect(acc.last('items', 'fallback')).toBe('fallback');
    });

    it('first() on non-array path returns defaultValue', () => {
        const acc = SafeAccess.fromJson('{"items":42}');
        expect(acc.first('items')).toBeNull();
    });
});

// ── DataMasker — wildcard and edge cases ────────────────────────
describe('DataMasker — wildcard edge cases', () => {
    it('masks all keys with bare "*" wildcard pattern', () => {
        const data = { name: 'visible', role: 'admin' };
        const result = mask(data, ['*']);
        expect(result.name).toBe('[REDACTED]');
        expect(result.role).toBe('[REDACTED]');
    });

    it('handles pattern with wildcard AND regex special chars (non-* escaping)', () => {
        // Pattern with $ AND * to ensure non-* special chars go through the escape branch
        const data = { price$usd: 100, other: 'keep' };
        const result = mask(data, ['price$*']);
        expect(result['price$usd']).toBe('[REDACTED]');
        expect(result.other).toBe('keep');
    });

    it('skips primitive items (non-objects) inside arrays', () => {
        const data = { items: ['string-value', 42, null, { password: 'secret' }] };
        const result = mask(data) as { items: unknown[] };
        // Primitives remain untouched, object gets masked
        expect(result.items[0]).toBe('string-value');
        expect(result.items[1]).toBe(42);
        expect(result.items[2]).toBeNull();
        expect((result.items[3] as Record<string, unknown>).password).toBe('[REDACTED]');
    });
});

// ── IpRangeChecker — positive allowedHosts and public IP ────────
describe('IpRangeChecker — positive paths', () => {
    it('allows URL when host IS in allowedHosts', async () => {
        const { assertSafeUrl } = await import('../../src/core/ip-range-checker');
        expect(() =>
            assertSafeUrl('https://example.com', { allowedHosts: ['example.com'] }),
        ).not.toThrow();
    });

    it('allows public IP addresses (non-private)', async () => {
        const { assertSafeUrl } = await import('../../src/core/ip-range-checker');
        // 8.8.8.8 is a public IP — should not throw
        expect(() => assertSafeUrl('https://8.8.8.8')).not.toThrow();
    });
});

// ── JsonPatch — invalid pointer and array traversal ─────────────
describe('JsonPatch — pointer edge cases', () => {
    it('throws on invalid JSON Pointer (no leading /)', () => {
        const data = { a: 1 };
        const ops: JsonPatchOp[] = [{ op: 'replace', path: 'invalid-no-slash', value: 2 }];
        expect(() => applyPatch(data, ops)).toThrow('Invalid JSON Pointer');
    });

    it('setAtPointer traverses through arrays', () => {
        const data = { items: [{ name: 'old' }] };
        const ops: JsonPatchOp[] = [{ op: 'replace', path: '/items/0/name', value: 'new' }];
        const result = applyPatch(data, ops) as { items: Array<{ name: string }> };
        expect(result.items[0].name).toBe('new');
    });

    it('removeAtPointer traverses through arrays', () => {
        const data = { items: [{ name: 'old', extra: true }] };
        const ops: JsonPatchOp[] = [{ op: 'remove', path: '/items/0/extra' }];
        const result = applyPatch(data, ops) as { items: Array<Record<string, unknown>> };
        expect(result.items[0]).toEqual({ name: 'old' });
    });
});

// ── optionalRequire — missing module throws ─────────────────────
describe('optionalRequire — missing module', () => {
    it('throws descriptive error when required module is not installed', () => {
        const getter = optionalRequire('nonexistent-module-safe-access-test', 'TestFeature');
        expect(() => getter()).toThrow(
            'nonexistent-module-safe-access-test is required for TestFeature support',
        );
    });
});

// ── SafeAccess.resetAll — test teardown helper ──────────────────
describe('SafeAccess.resetAll()', () => {
    it('resets all global/static state', () => {
        // Set up some state
        PathCache.set('test.path', [{ type: 'key' as const, value: 'test' }]);
        PluginRegistry.registerSerializer('test-fmt', {
            serialize: () => 'test',
        });

        SafeAccess.resetAll();

        // Verify reset
        expect(PathCache.has('test.path')).toBe(false);
        expect(PluginRegistry.hasSerializer('test-fmt')).toBe(false);
    });

    it('private constructor is callable via reflection', () => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const instance = new (SafeAccess as any)();
        expect(instance).toBeDefined();
    });
});
