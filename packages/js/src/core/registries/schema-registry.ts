import { SchemaRegistryImpl } from './schema-registry-impl';
import type { SchemaAdapterInterface } from '../../contracts/schema-adapter.interface';
import type { ISchemaRegistry } from '../../contracts/schema-registry.contract';

/** Module-level default instance backing the static facade. */
const _defaultSchemaRegistry: SchemaRegistryImpl = new SchemaRegistryImpl();

/**
 * Global registry for a default schema adapter.
 *
 * All static methods delegate to a shared module-level default instance, preserving
 * the existing API. For test isolation or DI, use {@link SchemaRegistry.create} to
 * obtain a fresh {@link ISchemaRegistry} instance that is fully independent of the global state.
 *
 * Users can set a default adapter so they don't need to pass it every time.
 *
 * @remarks
 * **Static module-level state:** The default registry instance (`_defaultSchemaRegistry`)
 * is module-level and therefore shared across the entire process. In long-running
 * runtimes (Bun, Node.js cluster workers, Nitro, Fastify) the default adapter set in
 * one request persists into subsequent requests. Call {@link SchemaRegistry.clearDefaultAdapter}
 * in your worker boot/reset hook to prevent stale adapter references from leaking
 * between requests.
 * PHP alignment: mirrors `SchemaRegistry.php` static-state warning.
 */
export class SchemaRegistry {
    /**
     * Creates a new, isolated schema registry instance.
     *
     * Use this in tests or DI contexts where you need a scope that is completely
     * independent of the global default registry.
     *
     * @returns A fresh {@link ISchemaRegistry} instance.
     */
    static create(): ISchemaRegistry {
        return new SchemaRegistryImpl();
    }

    /**
     * Returns the global default registry instance backing all static methods.
     *
     * Prefer the static convenience methods for most use-cases; use `getDefault()`
     * only when you need to pass the registry as an {@link ISchemaRegistry} reference.
     *
     * @returns The shared module-level {@link ISchemaRegistry}.
     */
    static getDefault(): ISchemaRegistry {
        return _defaultSchemaRegistry;
    }

    // ── Static facade (backward-compatible API) ──

    /**
     * Sets the adapter that will be used by default when no adapter is passed to `validate()`.
     *
     * @param adapter - The schema adapter to register as the global default.
     */
    static setDefaultAdapter(adapter: SchemaAdapterInterface): void {
        _defaultSchemaRegistry.setDefaultAdapter(adapter);
    }

    /**
     * Returns the current default adapter.
     *
     * @returns The registered default {@link SchemaAdapterInterface}, or `null` if none is set.
     */
    static getDefaultAdapter(): SchemaAdapterInterface | null {
        return _defaultSchemaRegistry.getDefaultAdapter();
    }

    /**
     * Removes the default adapter so subsequent `validate()` calls require an explicit adapter.
     */
    static clearDefaultAdapter(): void {
        _defaultSchemaRegistry.clearDefaultAdapter();
    }
}
