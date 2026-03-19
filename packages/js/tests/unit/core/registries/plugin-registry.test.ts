import { describe, it, expect, beforeEach } from 'vitest';
import { PluginRegistry } from '../../../../src/core/registries/plugin-registry';
import { UnsupportedTypeError } from '../../../../src/exceptions/unsupported-type.error';
import { SafeAccess } from '../../../../src/safe-access';
import type {
    ParserPlugin,
    SerializerPlugin,
} from '../../../../src/core/registries/plugin-registry';

beforeEach(() => {
    PluginRegistry.reset();
});

describe(PluginRegistry.name, () => {
    // ── Parser Registration ──

    it('registers and retrieves a parser', () => {
        const parser: ParserPlugin = { parse: () => ({ parsed: true }) };
        PluginRegistry.registerParser('yaml', parser);

        expect(PluginRegistry.hasParser('yaml')).toBe(true);
        expect(PluginRegistry.getParser('yaml')).toBe(parser);
    });

    it('hasParser returns false for unregistered format', () => {
        expect(PluginRegistry.hasParser('yaml')).toBe(false);
    });

    it('getParser throws for unregistered format', () => {
        expect(() => PluginRegistry.getParser('yaml')).toThrow(UnsupportedTypeError);
        expect(() => PluginRegistry.getParser('yaml')).toThrow(
            "No parser registered for format 'yaml'",
        );
    });

    it('replaces parser when registering same format twice', () => {
        const parser1: ParserPlugin = { parse: () => ({ v: 1 }) };
        const parser2: ParserPlugin = { parse: () => ({ v: 2 }) };

        PluginRegistry.registerParser('yaml', parser1);
        PluginRegistry.registerParser('yaml', parser2);

        expect(PluginRegistry.getParser('yaml')).toBe(parser2);
    });

    // ── Serializer Registration ──

    it('registers and retrieves a serializer', () => {
        const serializer: SerializerPlugin = { serialize: () => 'serialized' };
        PluginRegistry.registerSerializer('yaml', serializer);

        expect(PluginRegistry.hasSerializer('yaml')).toBe(true);
        expect(PluginRegistry.getSerializer('yaml')).toBe(serializer);
    });

    it('replaces serializer when registering same format twice', () => {
        const ser1: SerializerPlugin = { serialize: () => 'v1' };
        const ser2: SerializerPlugin = { serialize: () => 'v2' };

        PluginRegistry.registerSerializer('yaml', ser1);
        PluginRegistry.registerSerializer('yaml', ser2);

        expect(PluginRegistry.getSerializer('yaml')).toBe(ser2);
    });

    it('hasSerializer returns false for unregistered format', () => {
        expect(PluginRegistry.hasSerializer('yaml')).toBe(false);
    });

    it('getSerializer throws for unregistered format', () => {
        expect(() => PluginRegistry.getSerializer('xml')).toThrow(UnsupportedTypeError);
        expect(() => PluginRegistry.getSerializer('xml')).toThrow(
            "No serializer registered for format 'xml'",
        );
    });

    // ── Reset ──

    it('reset clears all registered plugins', () => {
        const parser: ParserPlugin = { parse: () => ({}) };
        const serializer: SerializerPlugin = { serialize: () => '' };

        PluginRegistry.registerParser('yaml', parser);
        PluginRegistry.registerSerializer('yaml', serializer);

        expect(PluginRegistry.hasParser('yaml')).toBe(true);
        expect(PluginRegistry.hasSerializer('yaml')).toBe(true);

        PluginRegistry.reset();

        expect(PluginRegistry.hasParser('yaml')).toBe(false);
        expect(PluginRegistry.hasSerializer('yaml')).toBe(false);
    });

    // ── Multiple Formats ──

    it('supports multiple formats simultaneously', () => {
        const yamlParser: ParserPlugin = { parse: () => ({ format: 'yaml' }) };
        const tomlParser: ParserPlugin = { parse: () => ({ format: 'toml' }) };

        PluginRegistry.registerParser('yaml', yamlParser);
        PluginRegistry.registerParser('toml', tomlParser);

        expect(PluginRegistry.getParser('yaml').parse('')).toEqual({ format: 'yaml' });
        expect(PluginRegistry.getParser('toml').parse('')).toEqual({ format: 'toml' });
    });

    // ── Serialization via AbstractAccessor ──

    it('toYaml uses default js-yaml when no serializer registered', () => {
        const accessor = SafeAccess.fromArray([1, 2]);
        const result = accessor.toYaml();
        expect(typeof result).toBe('string');
    });

    it('toXml uses built-in serializer when no plugin registered', () => {
        const accessor = SafeAccess.fromArray([1, 2]);
        const xml = accessor.toXml();
        expect(xml).toContain('<?xml version="1.0"?>');
        expect(xml).toContain('<root>');
    });

    it('toYaml uses registered serializer plugin', () => {
        PluginRegistry.registerSerializer('yaml', {
            serialize: (data) => `yaml:${JSON.stringify(data)}`,
        });

        const accessor = SafeAccess.fromObject({ key: 'value' });
        expect(accessor.toYaml()).toBe('yaml:{"key":"value"}');
    });

    it('toXml uses registered serializer plugin', () => {
        PluginRegistry.registerSerializer('xml', {
            serialize: (data) => `<root>${JSON.stringify(data)}</root>`,
        });

        const accessor = SafeAccess.fromObject({ key: 'value' });
        expect(accessor.toXml()).toBe('<root>{"key":"value"}</root>');
    });

    it('transform uses registered serializer plugin', () => {
        PluginRegistry.registerSerializer('custom', {
            serialize: (data) => `custom:${JSON.stringify(data)}`,
        });

        const accessor = SafeAccess.fromObject({ key: 'value' });
        expect(accessor.transform('custom')).toBe('custom:{"key":"value"}');
    });

    it('transform throws for unregistered format', () => {
        const accessor = SafeAccess.fromObject({ key: 'value' });
        expect(() => accessor.transform('nonexistent')).toThrow(UnsupportedTypeError);
        expect(() => accessor.transform('nonexistent')).toThrow(
            "No serializer registered for format 'nonexistent'",
        );
    });

    // ── Parser plugin override for YAML/TOML ──

    it('YAML accessor uses registered parser plugin over built-in', () => {
        PluginRegistry.registerParser('yaml', {
            parse: () => ({ overridden: true, source: 'plugin' }),
        });

        const accessor = SafeAccess.fromYaml('any string');
        expect(accessor.get('overridden')).toBe(true);
        expect(accessor.get('source')).toBe('plugin');
    });

    it('TOML accessor uses registered parser plugin over built-in', () => {
        PluginRegistry.registerParser('toml', {
            parse: () => ({ overridden: true, source: 'plugin' }),
        });

        const accessor = SafeAccess.fromToml('any string');
        expect(accessor.get('overridden')).toBe(true);
        expect(accessor.get('source')).toBe('plugin');
    });

    it('YAML accessor falls back to built-in parser when no plugin registered', () => {
        // No plugin registered — should use built-in lightweight parser
        const accessor = SafeAccess.fromYaml('name: Ana\nage: 30');
        expect(accessor.get('name')).toBe('Ana');
        expect(accessor.get('age')).toBe(30);
    });

    it('TOML accessor falls back to built-in parser when no plugin registered', () => {
        // No plugin registered — should use built-in lightweight parser
        const accessor = SafeAccess.fromToml('title = "Test"\nport = 8080');
        expect(accessor.get('title')).toBe('Test');
        expect(accessor.get('port')).toBe(8080);
    });
});
