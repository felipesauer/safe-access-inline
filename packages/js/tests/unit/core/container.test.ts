import { describe, it, expect, afterEach } from 'vitest';
import { ServiceContainer, defaultContainer } from '../../../src/core/container';
import { PluginRegistry } from '../../../src/core/registries/plugin-registry';
import { SchemaRegistry } from '../../../src/core/registries/schema-registry';
import type { IPluginRegistry } from '../../../src/contracts/plugin-registry.contract';
import type { ISchemaRegistry } from '../../../src/contracts/schema-registry.contract';
import type { SchemaAdapterInterface } from '../../../src/contracts/schema-adapter.interface';

afterEach(() => {
    PluginRegistry.reset();
    SchemaRegistry.clearDefaultAdapter();
});

describe(ServiceContainer.name, () => {
    // ── defaultContainer ──

    describe('defaultContainer', () => {
        it('pluginRegistry references the global default', () => {
            expect(defaultContainer.pluginRegistry).toBe(PluginRegistry.getDefault());
        });

        it('schemaRegistry references the global default', () => {
            expect(defaultContainer.schemaRegistry).toBe(SchemaRegistry.getDefault());
        });

        it('changes to defaultContainer.pluginRegistry are visible via PluginRegistry static API', () => {
            defaultContainer.pluginRegistry.registerParser('test-format', {
                parse: () => ({ test: true }),
            });
            expect(PluginRegistry.hasParser('test-format')).toBe(true);
        });
    });

    // ── ServiceContainer.create ──

    describe('ServiceContainer.create()', () => {
        it('returns a new container', () => {
            const a = ServiceContainer.create();
            const b = ServiceContainer.create();
            expect(a).not.toBe(b);
        });

        it('pluginRegistry is isolated from the global default', () => {
            const container = ServiceContainer.create();
            container.pluginRegistry.registerParser('isolated-format', {
                parse: () => ({ isolated: true }),
            });
            expect(PluginRegistry.hasParser('isolated-format')).toBe(false);
            expect(container.pluginRegistry.hasParser('isolated-format')).toBe(true);
        });

        it('schemaRegistry is isolated from the global default', () => {
            const mockAdapter: SchemaAdapterInterface = {
                validate: () => ({ valid: true, errors: [] }),
            };
            const container = ServiceContainer.create();
            container.schemaRegistry.setDefaultAdapter(mockAdapter);
            expect(SchemaRegistry.getDefaultAdapter()).toBeNull();
            expect(container.schemaRegistry.getDefaultAdapter()).toBe(mockAdapter);
        });

        it('two created containers are independent', () => {
            const a = ServiceContainer.create();
            const b = ServiceContainer.create();
            a.pluginRegistry.registerSerializer('fmt', {
                serialize: () => 'from-a',
            });
            expect(b.pluginRegistry.hasSerializer('fmt')).toBe(false);
        });
    });

    // ── Custom constructor injection ──

    describe('constructor injection', () => {
        it('accepts a custom IPluginRegistry', () => {
            const customRegistry: IPluginRegistry = PluginRegistry.create();
            const container = new ServiceContainer({ pluginRegistry: customRegistry });
            expect(container.pluginRegistry).toBe(customRegistry);
        });

        it('accepts a custom ISchemaRegistry', () => {
            const customRegistry: ISchemaRegistry = SchemaRegistry.create();
            const container = new ServiceContainer({ schemaRegistry: customRegistry });
            expect(container.schemaRegistry).toBe(customRegistry);
        });

        it('falls back to global defaults when no overrides provided', () => {
            const container = new ServiceContainer();
            expect(container.pluginRegistry).toBe(PluginRegistry.getDefault());
            expect(container.schemaRegistry).toBe(SchemaRegistry.getDefault());
        });
    });
});

// ── PluginRegistry.create ──

describe('PluginRegistry.create()', () => {
    it('returns an IPluginRegistry that satisfies the interface', () => {
        const reg = PluginRegistry.create();
        expect(typeof reg.registerParser).toBe('function');
        expect(typeof reg.hasParser).toBe('function');
        expect(typeof reg.getParser).toBe('function');
        expect(typeof reg.registerSerializer).toBe('function');
        expect(typeof reg.hasSerializer).toBe('function');
        expect(typeof reg.getSerializer).toBe('function');
        expect(typeof reg.reset).toBe('function');
    });

    it('starts empty', () => {
        const reg = PluginRegistry.create();
        expect(reg.hasParser('any')).toBe(false);
        expect(reg.hasSerializer('any')).toBe(false);
    });

    it('registration is not visible in global default', () => {
        const reg = PluginRegistry.create();
        reg.registerParser('private-format', { parse: () => ({}) });
        expect(PluginRegistry.hasParser('private-format')).toBe(false);
    });

    it('reset clears only its own entries', () => {
        const reg = PluginRegistry.create();
        reg.registerParser('fmt', { parse: () => ({}) });
        PluginRegistry.registerParser('global-fmt', { parse: () => ({}) });
        reg.reset();
        expect(reg.hasParser('fmt')).toBe(false);
        expect(PluginRegistry.hasParser('global-fmt')).toBe(true);
    });
});

// ── SchemaRegistry.create ──

describe('SchemaRegistry.create()', () => {
    it('returns an ISchemaRegistry that satisfies the interface', () => {
        const reg = SchemaRegistry.create();
        expect(typeof reg.setDefaultAdapter).toBe('function');
        expect(typeof reg.getDefaultAdapter).toBe('function');
        expect(typeof reg.clearDefaultAdapter).toBe('function');
    });

    it('starts with null adapter', () => {
        const reg = SchemaRegistry.create();
        expect(reg.getDefaultAdapter()).toBeNull();
    });

    it('setDefaultAdapter and getDefaultAdapter roundtrip', () => {
        const adapter: SchemaAdapterInterface = { validate: () => ({ valid: true, errors: [] }) };
        const reg = SchemaRegistry.create();
        reg.setDefaultAdapter(adapter);
        expect(reg.getDefaultAdapter()).toBe(adapter);
    });

    it('isolation: setting adapter does not affect global default', () => {
        const adapter: SchemaAdapterInterface = { validate: () => ({ valid: true, errors: [] }) };
        const reg = SchemaRegistry.create();
        reg.setDefaultAdapter(adapter);
        expect(SchemaRegistry.getDefaultAdapter()).toBeNull();
    });

    it('clearDefaultAdapter sets adapter back to null', () => {
        const adapter: SchemaAdapterInterface = { validate: () => ({ valid: true, errors: [] }) };
        const reg = SchemaRegistry.create();
        reg.setDefaultAdapter(adapter);
        reg.clearDefaultAdapter();
        expect(reg.getDefaultAdapter()).toBeNull();
    });
});
