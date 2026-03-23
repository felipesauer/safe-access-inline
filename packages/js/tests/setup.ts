// Individual test files are responsible for resetting the global state they mutate.
// See packages/js/src/core/container.ts and PluginRegistry.create() / SchemaRegistry.create()
// for isolated-instance DI patterns that avoid shared-state issues entirely.
