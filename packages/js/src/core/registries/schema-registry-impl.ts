import type { SchemaAdapterInterface } from '../../contracts/schema-adapter.interface';
import type { ISchemaRegistry } from '../../contracts/schema-registry.contract';
import { AuditEventType, emitAudit } from '../../security/audit/audit-emitter';

/**
 * Concrete, instantiable implementation of {@link ISchemaRegistry}.
 *
 * Used internally by the global {@link SchemaRegistry} static facade and by
 * isolated instances created via {@link SchemaRegistry.create} for DI / testing.
 *
 * @internal
 */
export class SchemaRegistryImpl implements ISchemaRegistry {
    private defaultAdapter: SchemaAdapterInterface | null = null;

    /**
     * Sets the adapter that will be used by default when no adapter is passed to `validate()`.
     *
     * @param adapter - The schema adapter to register as the global default.
     */
    setDefaultAdapter(adapter: SchemaAdapterInterface): void {
        if (this.defaultAdapter !== null) {
            emitAudit(AuditEventType.PLUGIN_OVERWRITE, {
                kind: 'schema-adapter',
                message: 'Default schema adapter is being overwritten.',
            });
        }
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
