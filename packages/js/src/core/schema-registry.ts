import type { SchemaAdapterInterface } from '../contracts/schema-adapter.interface';

/**
 * Global registry for a default schema adapter.
 * Users can set a default adapter so they don't need to pass it every time.
 */
export class SchemaRegistry {
    private static defaultAdapter: SchemaAdapterInterface | null = null;

    static setDefaultAdapter(adapter: SchemaAdapterInterface): void {
        SchemaRegistry.defaultAdapter = adapter;
    }

    static getDefaultAdapter(): SchemaAdapterInterface | null {
        return SchemaRegistry.defaultAdapter;
    }

    static clearDefaultAdapter(): void {
        SchemaRegistry.defaultAdapter = null;
    }
}
