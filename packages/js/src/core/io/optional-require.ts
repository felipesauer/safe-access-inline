import { createRequire } from 'node:module';

// In CJS (tsup/esbuild output), `import.meta` becomes `{}` (url is undefined)
// and the native `require` is available. In ESM, `import.meta.url` is a real
// file URL and we must use `createRequire` to obtain a synchronous require.
/* v8 ignore next -- CJS fallback: test environment is always ESM */
const _require = import.meta.url ? createRequire(import.meta.url) : require;

/**
 * Lazily loads an optional peer dependency.
 *
 * Returns a getter function that, on first call, attempts to require `moduleId`.
 * Subsequent calls reuse the cached module. Throws a helpful install message when
 * the module is absent.
 *
 * @param moduleId - NPM package name to require (e.g. `'js-yaml'`).
 * @param featureName - Human-readable feature name used in error messages (e.g. `'YAML'`).
 * @returns A zero-argument getter that resolves to `T` or throws on first use.
 */
export function optionalRequire<T>(moduleId: string, featureName: string): () => T {
    let mod: T | undefined;
    let attempted = false;

    return (): T => {
        if (!attempted) {
            attempted = true;
            try {
                mod = _require(moduleId) as T;
            } catch {
                // Not installed — will throw below
            }
        }
        if (mod === undefined) {
            throw new Error(
                `${moduleId} is required for ${featureName} support. Install it with: npm install ${moduleId}`,
            );
        }
        return mod;
    };
}
