import type { SchemaAdapterInterface } from './schema-adapter.interface';

/**
 * Contract for a schema registry that stores a default schema adapter.
 *
 * Both the global-singleton `SchemaRegistry` (static facade) and any
 * isolated instance created via `SchemaRegistry.create()` satisfy this interface,
 * enabling dependency-injection in tests and library extensions.
 */
export interface ISchemaRegistry {
    /**
     * Sets the adapter that will be used by default when no adapter is passed to `validate()`.
     *
     * @param adapter - The schema adapter to register as the global default.
     */
    setDefaultAdapter(adapter: SchemaAdapterInterface): void;

    /**
     * Returns the current default adapter.
     *
     * @returns The registered default {@link SchemaAdapterInterface}, or `null` if none is set.
     */
    getDefaultAdapter(): SchemaAdapterInterface | null;

    /**
     * Removes the default adapter so subsequent `validate()` calls require an explicit adapter.
     */
    clearDefaultAdapter(): void;
}
