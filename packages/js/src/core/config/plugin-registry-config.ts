/**
 * Configuration for the {@link PluginRegistry}.
 */
export interface PluginRegistryConfig {
    /**
     * Maximum number of parser plugins that can be registered.
     *
     * Bounding the registry prevents unbounded heap growth in long-running processes
     * or multi-tenant contexts where `registerParser()` could be called with many
     * adversarially distinct format keys.
     */
    readonly maxParsers: number;

    /**
     * Maximum number of serializer plugins that can be registered.
     *
     * @see {@link maxParsers}
     */
    readonly maxSerializers: number;
}

/** Sensible defaults for {@link PluginRegistryConfig}. */
export const DEFAULT_PLUGIN_REGISTRY_CONFIG: PluginRegistryConfig = Object.freeze({
    maxParsers: 50,
    maxSerializers: 50,
});
