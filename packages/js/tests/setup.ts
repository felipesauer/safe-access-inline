// Individual test files are responsible for resetting the global state they mutate.
// See packages/js/src/core/container.ts and PluginRegistry.create()
// for isolated-instance DI patterns that avoid shared-state issues entirely.
//
// NOTE (ARCH-001): A global afterEach calling SafeAccess.resetAll() cannot be added here
// because several test files mutate global state (e.g. global policy, plugin registry)
// without restoring it. Each test file that mutates global state must provide its own
// afterEach(() => SafeAccess.resetAll()) or reset the specific singletons it touched.
