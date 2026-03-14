/**
 * Tests for SecurityPolicy (Phase 16.9) and AuditLogger (Phase 16.10).
 */
import { describe, it, expect, afterEach, vi } from 'vitest';
import { SafeAccess } from '../../../src/safe-access';
import {
    defaultPolicy,
    mergePolicy,
    STRICT_POLICY,
    PERMISSIVE_POLICY,
    setGlobalPolicy,
    clearGlobalPolicy,
} from '../../../src/core/security-policy';
import type { SecurityPolicy } from '../../../src/core/security-policy';
import { onAudit, emitAudit, clearAuditListeners } from '../../../src/core/audit-emitter';
import type { AuditEvent } from '../../../src/core/audit-emitter';
import { mask } from '../../../src/core/data-masker';
import * as fs from 'node:fs';
import * as path from 'node:path';
import * as os from 'node:os';

afterEach(() => {
    clearAuditListeners();
    clearGlobalPolicy();
});

// ── SecurityPolicy ──────────────────────────────────────
describe('SecurityPolicy', () => {
    it('defaultPolicy returns expected defaults', () => {
        const policy = defaultPolicy();
        expect(policy.maxDepth).toBe(512);
        expect(policy.maxPayloadBytes).toBe(10_485_760);
        expect(policy.maxKeys).toBe(10_000);
        expect(policy.csvMode).toBe('none');
    });

    it('mergePolicy merges overrides', () => {
        const base = defaultPolicy();
        const merged = mergePolicy(base, { maxDepth: 100, csvMode: 'strip' });
        expect(merged.maxDepth).toBe(100);
        expect(merged.csvMode).toBe('strip');
        // Unchanged defaults
        expect(merged.maxPayloadBytes).toBe(10_485_760);
    });

    it('mergePolicy merges url sub-object', () => {
        const base: SecurityPolicy = {
            ...defaultPolicy(),
            url: { allowedPorts: [443] },
        };
        const merged = mergePolicy(base, { url: { allowedHosts: ['example.com'] } });
        expect(merged.url?.allowedPorts).toEqual([443]);
        expect(merged.url?.allowedHosts).toEqual(['example.com']);
    });

    it('mergePolicy with no overrides returns copy', () => {
        const base = defaultPolicy();
        const merged = mergePolicy(base);
        expect(merged).toEqual(base);
        expect(merged).not.toBe(base); // new object
    });

    it('STRICT_POLICY has restrictive limits', () => {
        expect(STRICT_POLICY.maxDepth).toBe(20);
        expect(STRICT_POLICY.maxPayloadBytes).toBe(1_048_576);
        expect(STRICT_POLICY.maxKeys).toBe(1_000);
        expect(STRICT_POLICY.csvMode).toBe('strip');
    });

    it('PERMISSIVE_POLICY has relaxed limits', () => {
        expect(PERMISSIVE_POLICY.maxDepth).toBe(1_024);
        expect(PERMISSIVE_POLICY.maxPayloadBytes).toBe(104_857_600);
        expect(PERMISSIVE_POLICY.maxKeys).toBe(100_000);
        expect(PERMISSIVE_POLICY.csvMode).toBe('none');
    });

    it('setGlobalPolicy affects defaultPolicy', () => {
        setGlobalPolicy({ maxDepth: 42 });
        const policy = defaultPolicy();
        expect(policy.maxDepth).toBe(42);
    });

    it('clearGlobalPolicy resets to defaults', () => {
        setGlobalPolicy({ maxDepth: 42 });
        clearGlobalPolicy();
        const policy = defaultPolicy();
        expect(policy.maxDepth).toBe(512);
    });

    it('SafeAccess.setGlobalPolicy delegates to security-policy', () => {
        SafeAccess.setGlobalPolicy({ maxKeys: 50 });
        const policy = defaultPolicy();
        expect(policy.maxKeys).toBe(50);
    });

    it('SafeAccess.clearGlobalPolicy delegates to security-policy', () => {
        SafeAccess.setGlobalPolicy({ maxKeys: 50 });
        SafeAccess.clearGlobalPolicy();
        const policy = defaultPolicy();
        expect(policy.maxKeys).toBe(10_000);
    });

    it('withPolicy throws when maxKeys exceeded', () => {
        const bigData: Record<string, unknown> = {};
        for (let i = 0; i < 20; i++) bigData[`k${i}`] = i;
        expect(() => SafeAccess.withPolicy(bigData, { maxKeys: 5 })).toThrow('exceeding maximum');
    });

    it('withPolicy throws when maxPayloadBytes exceeded for string data', () => {
        const bigString = '{' + '"a":"' + 'x'.repeat(200) + '"}';
        expect(() => SafeAccess.withPolicy(bigString, { maxPayloadBytes: 10 })).toThrow(
            'exceeds maximum',
        );
    });

    it('withPolicy skips payload check for non-string data with maxPayloadBytes', () => {
        const acc = SafeAccess.withPolicy({ a: 1 }, { maxPayloadBytes: 10 });
        expect(acc.get('a')).toBe(1);
    });

    it('SafeAccess.withPolicy resolves data through auto-detection', () => {
        const acc = SafeAccess.withPolicy({ name: 'test' }, defaultPolicy());
        expect(acc.get('name')).toBe('test');
    });

    it('SafeAccess.withPolicy applies maskPatterns', () => {
        const policy: SecurityPolicy = {
            ...defaultPolicy(),
            maskPatterns: ['password'],
        };
        const acc = SafeAccess.withPolicy({ user: 'john', password: 'secret' }, policy);
        expect(acc.get('user')).toBe('john');
        expect(acc.get('password')).toBe('[REDACTED]');
    });

    it('SafeAccess.fromFileWithPolicy loads file with allowedDirs', async () => {
        const tmpFile = path.join(os.tmpdir(), `sa-policy-${Date.now()}.json`);
        fs.writeFileSync(tmpFile, '{"key":"value","secret":"hidden"}');
        try {
            const acc = await SafeAccess.fromFileWithPolicy(tmpFile, {
                ...defaultPolicy(),
                allowedDirs: [os.tmpdir()],
            });
            expect(acc.get('key')).toBe('value');
        } finally {
            fs.unlinkSync(tmpFile);
        }
    });

    it('SafeAccess.fromFileWithPolicy applies maskPatterns', async () => {
        const tmpFile = path.join(os.tmpdir(), `sa-policy-mask-${Date.now()}.json`);
        fs.writeFileSync(tmpFile, '{"user":"john","password":"secret"}');
        try {
            const acc = await SafeAccess.fromFileWithPolicy(tmpFile, {
                allowedDirs: [os.tmpdir()],
                maskPatterns: ['password'],
            });
            expect(acc.get('user')).toBe('john');
            expect(acc.get('password')).toBe('[REDACTED]');
        } finally {
            fs.unlinkSync(tmpFile);
        }
    });

    it('SafeAccess.fromUrlWithPolicy fetches with policy URL options', async () => {
        vi.stubGlobal(
            'fetch',
            vi.fn().mockResolvedValue({
                ok: true,
                text: () => Promise.resolve('{"from":"url"}'),
            }),
        );
        try {
            const policy: SecurityPolicy = {
                ...defaultPolicy(),
                url: { allowedHosts: ['example.com'] },
            };
            const acc = await SafeAccess.fromUrlWithPolicy('https://example.com/data.json', policy);
            expect(acc.get('from')).toBe('url');
        } finally {
            vi.restoreAllMocks();
        }
    });

    it('SafeAccess.fromUrlWithPolicy applies maskPatterns', async () => {
        vi.stubGlobal(
            'fetch',
            vi.fn().mockResolvedValue({
                ok: true,
                text: () => Promise.resolve('{"user":"john","token":"abc123"}'),
            }),
        );
        try {
            const policy: SecurityPolicy = {
                ...defaultPolicy(),
                url: { allowedHosts: ['example.com'] },
                maskPatterns: ['token'],
            };
            const acc = await SafeAccess.fromUrlWithPolicy('https://example.com/data.json', policy);
            expect(acc.get('user')).toBe('john');
            expect(acc.get('token')).toBe('[REDACTED]');
        } finally {
            vi.restoreAllMocks();
        }
    });

    it('SafeAccess.fromUrlWithPolicy throws when maxPayloadBytes exceeded', async () => {
        vi.stubGlobal(
            'fetch',
            vi.fn().mockResolvedValue({
                ok: true,
                text: () => Promise.resolve('{"big":"' + 'x'.repeat(500) + '"}'),
            }),
        );
        try {
            const policy: SecurityPolicy = {
                ...defaultPolicy(),
                url: { allowedHosts: ['example.com'] },
                maxPayloadBytes: 10,
            };
            await expect(
                SafeAccess.fromUrlWithPolicy('https://example.com/data.json', policy),
            ).rejects.toThrow('exceeds maximum');
        } finally {
            vi.restoreAllMocks();
        }
    });

    it('SafeAccess.fromUrlWithPolicy throws when maxKeys exceeded', async () => {
        const obj: Record<string, unknown> = {};
        for (let i = 0; i < 20; i++) obj[`k${i}`] = i;
        vi.stubGlobal(
            'fetch',
            vi.fn().mockResolvedValue({
                ok: true,
                text: () => Promise.resolve(JSON.stringify(obj)),
            }),
        );
        try {
            const policy: SecurityPolicy = {
                ...defaultPolicy(),
                url: { allowedHosts: ['example.com'] },
                maxKeys: 5,
            };
            await expect(
                SafeAccess.fromUrlWithPolicy('https://example.com/data.json', policy),
            ).rejects.toThrow('exceeding maximum');
        } finally {
            vi.restoreAllMocks();
        }
    });

    it('SafeAccess.fromUrlWithPolicy skips payload and keys checks when not set', async () => {
        vi.stubGlobal(
            'fetch',
            vi.fn().mockResolvedValue({
                ok: true,
                text: () => Promise.resolve('{"a":1}'),
            }),
        );
        try {
            const policy: SecurityPolicy = {
                url: { allowedHosts: ['example.com'] },
            };
            const acc = await SafeAccess.fromUrlWithPolicy('https://example.com/data.json', policy);
            expect(acc.get('a')).toBe(1);
        } finally {
            vi.restoreAllMocks();
        }
    });
});

// ── AuditLogger ─────────────────────────────────────────
describe('AuditLogger', () => {
    it('emitAudit does nothing without listeners', () => {
        // Should not throw
        emitAudit('file.read', { filePath: 'test.json' });
    });

    it('onAudit listener receives events', () => {
        const events: AuditEvent[] = [];
        onAudit((e) => events.push(e));
        emitAudit('file.read', { filePath: 'test.json' });
        expect(events).toHaveLength(1);
        expect(events[0].type).toBe('file.read');
        expect(events[0].detail.filePath).toBe('test.json');
        expect(events[0].timestamp).toBeGreaterThan(0);
    });

    it('multiple listeners receive events', () => {
        const events1: AuditEvent[] = [];
        const events2: AuditEvent[] = [];
        onAudit((e) => events1.push(e));
        onAudit((e) => events2.push(e));
        emitAudit('data.mask', { patternCount: 3 });
        expect(events1).toHaveLength(1);
        expect(events2).toHaveLength(1);
    });

    it('unsubscribe function removes listener', () => {
        const events: AuditEvent[] = [];
        const off = onAudit((e) => events.push(e));
        emitAudit('file.read', { filePath: 'a.json' });
        expect(events).toHaveLength(1);
        off();
        emitAudit('file.read', { filePath: 'b.json' });
        expect(events).toHaveLength(1); // no new events
    });

    it('clearAuditListeners removes all listeners', () => {
        const events: AuditEvent[] = [];
        onAudit((e) => events.push(e));
        clearAuditListeners();
        emitAudit('file.read', { filePath: 'c.json' });
        expect(events).toHaveLength(0);
    });

    it('SafeAccess.onAudit delegates to audit-logger', () => {
        const events: AuditEvent[] = [];
        const off = SafeAccess.onAudit((e) => events.push(e));
        emitAudit('url.fetch', { url: 'https://example.com' });
        expect(events).toHaveLength(1);
        off();
    });

    it('SafeAccess.clearAuditListeners delegates to audit-logger', () => {
        const events: AuditEvent[] = [];
        SafeAccess.onAudit((e) => events.push(e));
        SafeAccess.clearAuditListeners();
        emitAudit('file.read', { filePath: 'd.json' });
        expect(events).toHaveLength(0);
    });
});

// ── Audit Integration ───────────────────────────────────
describe('Audit Integration', () => {
    it('file read emits audit event', () => {
        const events: AuditEvent[] = [];
        onAudit((e) => events.push(e));
        const tmpFile = path.join(os.tmpdir(), `sa-audit-${Date.now()}.json`);
        fs.writeFileSync(tmpFile, '{"a":1}');
        try {
            SafeAccess.fromFileSync(tmpFile);
            const fileEvents = events.filter((e) => e.type === 'file.read');
            expect(fileEvents.length).toBeGreaterThanOrEqual(1);
            expect(fileEvents[0].detail.filePath).toBe(tmpFile);
        } finally {
            fs.unlinkSync(tmpFile);
        }
    });

    it('data.mask emits audit event', () => {
        const events: AuditEvent[] = [];
        onAudit((e) => events.push(e));
        mask({ password: 'secret' }, ['password']);
        const maskEvents = events.filter((e) => e.type === 'data.mask');
        expect(maskEvents).toHaveLength(1);
        expect(maskEvents[0].detail.patternCount).toBe(1);
    });

    it('security.violation emits audit event on forbidden key', () => {
        const events: AuditEvent[] = [];
        onAudit((e) => events.push(e));
        const acc = SafeAccess.fromJson('{"key":"value"}');
        try {
            acc.set('__proto__', 'evil');
        } catch {
            // expected
        }
        const violations = events.filter((e) => e.type === 'security.violation');
        expect(violations.length).toBeGreaterThanOrEqual(1);
        expect(violations[0].detail.reason).toBe('forbidden_key');
    });

    it('url.fetch emits audit event', async () => {
        const events: AuditEvent[] = [];
        onAudit((e) => events.push(e));
        vi.stubGlobal(
            'fetch',
            vi.fn().mockResolvedValue({
                ok: true,
                text: () => Promise.resolve('{"url":"data"}'),
            }),
        );
        try {
            await SafeAccess.fromUrl('https://example.com/api.json');
            const urlEvents = events.filter((e) => e.type === 'url.fetch');
            expect(urlEvents).toHaveLength(1);
            expect(urlEvents[0].detail.url).toBe('https://example.com/api.json');
        } finally {
            vi.restoreAllMocks();
        }
    });

    it('unsubscribe from double call is safe', () => {
        const off = onAudit(() => {});
        off();
        off(); // double call should not throw
    });
});
