import type { IPluginRegistry } from '../contracts/plugin-registry.contract';
import type { ISchemaRegistry } from '../contracts/schema-registry.contract';
import { PluginRegistry } from './registries/plugin-registry';
import { SchemaRegistry } from './registries/schema-registry';

/**
 * Lightweight service container bundling the core registries.
 *
 * The global {@link defaultContainer} uses the process-wide singletons
 * (`PluginRegistry.getDefault()` and `SchemaRegistry.getDefault()`), matching
 * the behaviour of the existing static API.
 *
 * For test isolation or scoped DI, call {@link ServiceContainer.create} to
 * obtain a container with fully independent, fresh registry instances:
 *
 * ```ts
 * const container = ServiceContainer.create();
 * container.pluginRegistry.registerParser('toml', myTomlParser);
 * // → never pollutes the global PluginRegistry
 * ```
 */
export class ServiceContainer {
    /** Plugin registry instance used by this container. */
    readonly pluginRegistry: IPluginRegistry;

    /** Schema registry instance used by this container. */
    readonly schemaRegistry: ISchemaRegistry;

    /**
     * @param opts - Optional override for each registry.
     *   When omitted, the global default singletons are used.
     */
    constructor(opts?: { pluginRegistry?: IPluginRegistry; schemaRegistry?: ISchemaRegistry }) {
        this.pluginRegistry = opts?.pluginRegistry ?? PluginRegistry.getDefault();
        this.schemaRegistry = opts?.schemaRegistry ?? SchemaRegistry.getDefault();
    }

    /**
     * Creates a new container with fresh, isolated registry instances.
     *
     * No state is shared with the global defaults or with other containers
     * created via this method.
     *
     * @returns A new {@link ServiceContainer} with independent registries.
     */
    static create(): ServiceContainer {
        return new ServiceContainer({
            pluginRegistry: PluginRegistry.create(),
            schemaRegistry: SchemaRegistry.create(),
        });
    }
}

/**
 * Process-wide default container.
 *
 * Wraps the global `PluginRegistry` and `SchemaRegistry` singletons. This is
 * the container used implicitly by all static helper methods throughout the library.
 */
export const defaultContainer: ServiceContainer = new ServiceContainer();
