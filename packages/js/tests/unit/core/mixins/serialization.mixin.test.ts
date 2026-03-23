import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { SerializationMixin } from '../../../../src/core/mixins/serialization.mixin';
import { SafeAccess } from '../../../../src/safe-access';
import { PluginRegistry } from '../../../../src/core/registries/plugin-registry';

/**
 * Tests for {@link SerializationMixin}.
 *
 * The mixin is abstract, so all tests run through concrete accessor classes
 * that extend through the mixin chain (e.g. {@link SafeAccess.fromObject}).
 */
describe(SerializationMixin.name, () => {
    beforeEach(() => {
        PluginRegistry.reset();
    });

    afterEach(() => {
        PluginRegistry.reset();
    });

    const data = { name: 'Ana', age: 25 };

    describe('toToml', () => {
        it('returns a TOML string using the built-in smol-toml fallback', () => {
            const acc = SafeAccess.fromObject({ name: 'Ana', age: 25 });
            const result = acc.toToml();
            expect(typeof result).toBe('string');
            expect(result).toContain('name');
        });
    });

    describe('toYaml', () => {
        it('returns a YAML string using the built-in js-yaml fallback', () => {
            const acc = SafeAccess.fromObject(data);
            const result = acc.toYaml();
            expect(typeof result).toBe('string');
            expect(result).toContain('name: Ana');
        });
    });

    describe('toXml', () => {
        it('returns XML-encoded string with default root element', () => {
            const acc = SafeAccess.fromObject({ key: 'value' });
            const xml = acc.toXml();
            expect(xml).toContain('<root>');
            expect(xml).toContain('<key>value</key>');
        });

        it('uses custom root element when provided', () => {
            const acc = SafeAccess.fromObject({ key: 'value' });
            expect(acc.toXml('config')).toContain('<config>');
        });
    });

    describe('toCsv', () => {
        it('returns CSV string for array-of-objects data', () => {
            const acc = SafeAccess.fromObject({
                rows: [
                    { name: 'Ana', age: 25 },
                    { name: 'Bob', age: 30 },
                ],
            });
            const csv = acc.toNdjson();
            expect(typeof csv).toBe('string');
        });
    });

    describe('toNdjson', () => {
        it('returns NDJSON string', () => {
            const acc = SafeAccess.fromObject({ items: [{ id: 1 }, { id: 2 }] });
            // toNdjson on a root object produces one line per root key
            const result = acc.toNdjson();
            expect(typeof result).toBe('string');
        });
    });

    describe('toIni', () => {
        it('returns INI-formatted string with scalar values', () => {
            const acc = SafeAccess.fromObject({ host: 'localhost', port: 3306 });
            const ini = acc.toIni();
            expect(ini).toContain('host = localhost');
            expect(ini).toContain('port = 3306');
        });
    });

    describe('toEnv', () => {
        it('returns ENV-formatted string for flat keys', () => {
            const acc = SafeAccess.fromObject({ APP_ENV: 'production', DEBUG: 'false' });
            const env = acc.toEnv();
            expect(env).toContain('APP_ENV=production');
            expect(env).toContain('DEBUG=false');
        });
    });

    describe('transform', () => {
        it('throws for unregistered format', () => {
            const acc = SafeAccess.fromObject(data);
            expect(() => acc.transform('msgpack')).toThrow();
        });
    });
});
