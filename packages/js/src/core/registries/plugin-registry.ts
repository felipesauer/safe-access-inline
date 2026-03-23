import { PluginRegistryImpl } from './plugin-registry-impl';
import type {
    IPluginRegistry,
    ParserPlugin,
    SerializerPlugin,
} from '../../contracts/plugin-registry.contract';

export type { ParserPlugin, SerializerPlugin };

/** Module-level default instance backing the static facade. */
const _defaultPluginRegistry: PluginRegistryImpl = new PluginRegistryImpl();

/**
 * Central registry for parser and serializer plugins.
 *
 * All static methods delegate to a shared module-level default instance, preserving
 * the existing API. For test isolation or DI, use {@link PluginRegistry.create} to
 * obtain a fresh {@link IPluginRegistry} instance that is fully independent of the global state.
 *
 * Same architecture as the PHP PluginRegistry.
 *
 * @remarks
 * **Static module-level state:** The default registry instance (`_defaultPluginRegistry`)
 * is module-level and therefore shared across the entire process. In long-running
 * runtimes (Bun, Node.js cluster workers, Nitro, Fastify) plugins registered in one
 * request handler persist into subsequent requests. Use {@link PluginRegistry.create}
 * for isolated scopes, or call `PluginRegistry.reset()` in your worker boot/reset
 * hook to prevent stale plugin registrations from leaking between requests.
 * PHP alignment: mirrors `PluginRegistry.php` static-state warning.
 */
export class PluginRegistry {
    /**
     * Creates a new, isolated plugin registry instance.
     *
     * Use this in tests or DI contexts where you need a scope that is completely
     * independent of the global default registry.
     *
     * @returns A fresh {@link IPluginRegistry} instance.
     */
    static create(): IPluginRegistry {
        return new PluginRegistryImpl();
    }

    /**
     * Returns the global default registry instance backing all static methods.
     *
     * Prefer the static convenience methods for most use-cases; use `getDefault()`
     * only when you need to pass the registry as an {@link IPluginRegistry} reference.
     *
     * @returns The shared module-level {@link IPluginRegistry}.
     */
    static getDefault(): IPluginRegistry {
        return _defaultPluginRegistry;
    }

    // ── Static facade (backward-compatible API) ──

    /** Registers (or overwrites) a parser plugin for the given `format`. */
    static registerParser(format: string, parser: ParserPlugin): void {
        _defaultPluginRegistry.registerParser(format, parser);
    }

    /** Returns `true` if a parser is registered for `format`. */
    static hasParser(format: string): boolean {
        return _defaultPluginRegistry.hasParser(format);
    }

    /**
     * Returns the registered parser for `format`.
     * @throws {@link UnsupportedTypeError} When no parser is registered.
     */
    static getParser(format: string): ParserPlugin {
        return _defaultPluginRegistry.getParser(format);
    }

    /** Registers (or overwrites) a serializer plugin for the given `format`. */
    static registerSerializer(format: string, serializer: SerializerPlugin): void {
        _defaultPluginRegistry.registerSerializer(format, serializer);
    }

    /** Returns `true` if a serializer is registered for `format`. */
    static hasSerializer(format: string): boolean {
        return _defaultPluginRegistry.hasSerializer(format);
    }

    /**
     * Returns the registered serializer for `format`.
     * @throws {@link UnsupportedTypeError} When no serializer is registered.
     */
    static getSerializer(format: string): SerializerPlugin {
        return _defaultPluginRegistry.getSerializer(format);
    }

    /** Removes all registered parsers and serializers. Intended for test teardown. */
    static reset(): void {
        _defaultPluginRegistry.reset();
    }
}
