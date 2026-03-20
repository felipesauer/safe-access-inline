import type { SchemaAdapterInterface } from '../../contracts/schema-adapter.interface';

/**
 * Global registry for a default schema adapter.
 * Users can set a default adapter so they don't need to pass it every time.
 */
export class SchemaRegistry {
    private static defaultAdapter: SchemaAdapterInterface | null = null;

    /**
     * Sets the adapter that will be used by default when no adapter is passed to `validate()`.
     *
     * @param adapter - The schema adapter to register as the global default.
     */
    static setDefaultAdapter(adapter: SchemaAdapterInterface): void {
        SchemaRegistry.defaultAdapter = adapter;
    }

    /**
     * Returns the current default adapter.
     *
     * @returns The registered default {@link SchemaAdapterInterface}, or `null` if none is set.
     */
    static getDefaultAdapter(): SchemaAdapterInterface | null {
        return SchemaRegistry.defaultAdapter;
    }

    /**
     * Removes the default adapter so subsequent `validate()` calls require an explicit adapter.
     */
    static clearDefaultAdapter(): void {
        SchemaRegistry.defaultAdapter = null;
    }
}
