import type { SchemaAdapterInterface } from '../../contracts/schema-adapter.interface';
import type { ISchemaRegistry } from '../../contracts/schema-registry.contract';

/**
 * Concrete, instantiable implementation of {@link ISchemaRegistry}.
 *
 * Used internally by the global {@link SchemaRegistry} static facade and by
 * isolated instances created via {@link SchemaRegistry.create} for DI / testing.
 *
 * @internal
 */
class SchemaRegistryImpl implements ISchemaRegistry {
    private defaultAdapter: SchemaAdapterInterface | null = null;

    /**
     * Sets the adapter that will be used by default when no adapter is passed to `validate()`.
     *
     * @param adapter - The schema adapter to register as the global default.
     */
    setDefaultAdapter(adapter: SchemaAdapterInterface): void {
        this.defaultAdapter = adapter;
    }

    /**
     * Returns the current default adapter.
     *
     * @returns The registered default {@link SchemaAdapterInterface}, or `null` if none is set.
     */
    getDefaultAdapter(): SchemaAdapterInterface | null {
        return this.defaultAdapter;
    }

    /**
     * Removes the default adapter so subsequent `validate()` calls require an explicit adapter.
     */
    clearDefaultAdapter(): void {
        this.defaultAdapter = null;
    }
}

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
