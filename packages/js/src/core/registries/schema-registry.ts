import type { SchemaAdapterInterface } from '../../contracts/schema-adapter.interface';

/**
 * Global registry for a default schema adapter.
 * Users can set a default adapter so they don't need to pass it every time.
 */
export class SchemaRegistry {
    private static defaultAdapter: SchemaAdapterInterface | null = null;

    /** Sets the adapter that will be used by default when no adapter is passed to `validate()`. */
    static setDefaultAdapter(adapter: SchemaAdapterInterface): void {
        SchemaRegistry.defaultAdapter = adapter;
    }

    /** Returns the current default adapter, or `null` if none is set. */
    static getDefaultAdapter(): SchemaAdapterInterface | null {
        return SchemaRegistry.defaultAdapter;
    }

    /** Removes the default adapter. */
    static clearDefaultAdapter(): void {
        SchemaRegistry.defaultAdapter = null;
    }
}
