import { describe, it, expect, afterEach } from 'vitest';
import * as path from 'node:path';
import { SafeAccess } from '../../src/safe-access';
import { ObjectAccessor } from '../../src/accessors/object.accessor';
import { JsonAccessor } from '../../src/accessors/json.accessor';
import { SecurityError } from '../../src/exceptions/security.error';

const fixturesDir = path.resolve(__dirname, '../fixtures');

afterEach(() => {
    SafeAccess.resetAll();
});

describe(SafeAccess.name, () => {
    // ── streamCsv ──

    describe('streamCsv', () => {
        it('yields one ObjectAccessor per CSV data row', async () => {
            const rows: ObjectAccessor[] = [];
            for await (const row of SafeAccess.streamCsv(path.join(fixturesDir, 'data.csv'), {
                allowAnyPath: true,
            })) {
                rows.push(row);
            }
            expect(rows).toHaveLength(3);
        });

        it('each yielded accessor has header-keyed properties', async () => {
            const rows: ObjectAccessor[] = [];
            for await (const row of SafeAccess.streamCsv(path.join(fixturesDir, 'data.csv'), {
                allowAnyPath: true,
            })) {
                rows.push(row);
            }
            expect(rows[0].get('name')).toBe('Ana');
            expect(rows[0].get('age')).toBe('25');
            expect(rows[0].get('email')).toBe('ana@example.com');
        });

        it('all rows have the correct keys', async () => {
            const names: unknown[] = [];
            for await (const row of SafeAccess.streamCsv(path.join(fixturesDir, 'data.csv'), {
                allowAnyPath: true,
            })) {
                names.push(row.get('name'));
            }
            expect(names).toEqual(['Ana', 'Bob', 'Carlos']);
        });

        it('yields within allowedDirs restriction', async () => {
            const rows: ObjectAccessor[] = [];
            for await (const row of SafeAccess.streamCsv(path.join(fixturesDir, 'data.csv'), {
                allowedDirs: [fixturesDir],
            })) {
                rows.push(row);
            }
            expect(rows).toHaveLength(3);
        });

        it('throws SecurityError without allowedDirs or allowAnyPath', async () => {
            const gen = SafeAccess.streamCsv(path.join(fixturesDir, 'data.csv'));
            await expect(gen.next()).rejects.toBeInstanceOf(SecurityError);
        });

        it('skips empty lines in CSV file (line.trim() === "" guard)', async () => {
            const rows: ObjectAccessor[] = [];
            for await (const row of SafeAccess.streamCsv(
                path.join(fixturesDir, 'data-with-empty-lines.csv'),
                { allowAnyPath: true },
            )) {
                rows.push(row);
            }
            expect(rows).toHaveLength(2);
            expect(rows[0].get('name')).toBe('Ana');
            expect(rows[1].get('name')).toBe('Bob');
        });

        it('fills null for missing columns in a short row', async () => {
            const rows: ObjectAccessor[] = [];
            for await (const row of SafeAccess.streamCsv(
                path.join(fixturesDir, 'data-short-row.csv'),
                { allowAnyPath: true },
            )) {
                rows.push(row);
            }
            // Ana row has only 2 columns — the third (email) is null
            expect(rows[0].get('email')).toBeNull();
            // Bob row is complete
            expect(rows[1].get('email')).toBe('bob@example.com');
        });
    });

    // ── streamNdjson ──

    describe('streamNdjson', () => {
        it('yields one JsonAccessor per NDJSON line', async () => {
            const items: JsonAccessor[] = [];
            for await (const item of SafeAccess.streamNdjson(
                path.join(fixturesDir, 'data.ndjson'),
                { allowAnyPath: true },
            )) {
                items.push(item);
            }
            expect(items).toHaveLength(3);
        });

        it('each yielded accessor resolves JSON keys directly', async () => {
            const items: JsonAccessor[] = [];
            for await (const item of SafeAccess.streamNdjson(
                path.join(fixturesDir, 'data.ndjson'),
                { allowAnyPath: true },
            )) {
                items.push(item);
            }
            expect(items[0].get('name')).toBe('Ana');
            expect(items[0].get('age')).toBe(25);
        });

        it('all lines are parsed', async () => {
            const names: unknown[] = [];
            for await (const item of SafeAccess.streamNdjson(
                path.join(fixturesDir, 'data.ndjson'),
                { allowAnyPath: true },
            )) {
                names.push(item.get('name'));
            }
            expect(names).toEqual(['Ana', 'Bob', 'Carlos']);
        });

        it('throws SecurityError without allowedDirs or allowAnyPath', async () => {
            const gen = SafeAccess.streamNdjson(path.join(fixturesDir, 'data.ndjson'));
            await expect(gen.next()).rejects.toBeInstanceOf(SecurityError);
        });

        it('skips empty lines in NDJSON file (line.trim() === "" guard)', async () => {
            const items: JsonAccessor[] = [];
            for await (const item of SafeAccess.streamNdjson(
                path.join(fixturesDir, 'data-with-empty-lines.ndjson'),
                { allowAnyPath: true },
            )) {
                items.push(item);
            }
            expect(items).toHaveLength(2);
            expect(items[0].get('name')).toBe('Ana');
            expect(items[1].get('name')).toBe('Bob');
        });
    });
});
