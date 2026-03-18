import { SafeAccess } from '../safe-access';
import type { AbstractAccessor } from '../core/abstract-accessor';
import { resolve } from 'node:path';

/**
 * Options for the Vite safe-access plugin.
 */
export interface VitePluginOptions {
    /** Paths to config files (merged in order, last wins) */
    files: string[];
    /** Virtual module ID to import from (default: 'virtual:safe-access-config') */
    virtualId?: string;
    /** Allowed directories for file access */
    allowedDirs?: string[];
    /** Set to true to bypass path restrictions when no allowedDirs are configured */
    allowAnyPath?: boolean;
}

/**
 * Vite plugin that loads config files and exposes them as a virtual module.
 *
 * Usage in vite.config.ts:
 * ```ts
 * import { safeAccessPlugin } from '@safe-access-inline/safe-access-inline/integrations/vite';
 *
 * export default defineConfig({
 *   plugins: [
 *     safeAccessPlugin({
 *       files: ['./config/defaults.yaml', './config/local.json'],
 *     }),
 *   ],
 * });
 * ```
 *
 * Then in your app code:
 * ```ts
 * import config from 'virtual:safe-access-config';
 * // config is the merged JSON object
 * ```
 */
export function safeAccessPlugin(options: VitePluginOptions) {
    const virtualId = options.virtualId ?? 'virtual:safe-access-config';
    const resolvedVirtualId = '\0' + virtualId;
    let configData: Record<string, unknown> = {};

    function loadConfig(): Record<string, unknown> {
        const accessors = options.files.map((f) => {
            const filePath = resolve(f);
            return SafeAccess.fromFileSync(filePath, {
                allowedDirs: options.allowedDirs,
                allowAnyPath: options.allowAnyPath,
            });
        });
        if (accessors.length === 0) return {};
        const layered = SafeAccess.layer(accessors);
        return layered.toObject();
    }

    return {
        name: 'safe-access-config',

        buildStart() {
            configData = loadConfig();
        },

        resolveId(id: string) {
            if (id === virtualId) return resolvedVirtualId;
            return null;
        },

        load(id: string) {
            if (id === resolvedVirtualId) {
                return `export default ${JSON.stringify(configData)};`;
            }
            return null;
        },

        handleHotUpdate(ctx: { file: string; server: { ws: { send: (msg: unknown) => void } } }) {
            const watchedFiles = options.files.map((f) => resolve(f));
            if (watchedFiles.includes(ctx.file)) {
                try {
                    configData = loadConfig();
                    ctx.server.ws.send({
                        type: 'full-reload',
                        path: '*',
                    });
                } catch {
                    // Prevent invalid config from crashing the dev server
                }
            }
        },
    };
}

/**
 * Utility to load and merge config files synchronously (for use in vite.config.ts).
 *
 * ```ts
 * import { loadConfig } from '@safe-access-inline/safe-access-inline/integrations/vite';
 *
 * const config = loadConfig(['./config/defaults.yaml', './config/overrides.json']);
 * // Returns an AbstractAccessor with merged data
 * ```
 */
export function loadConfig(
    files: string[],
    options?: { allowedDirs?: string[]; allowAnyPath?: boolean },
): AbstractAccessor {
    const accessors = files.map((f) =>
        SafeAccess.fromFileSync(resolve(f), {
            allowedDirs: options?.allowedDirs,
            allowAnyPath: options?.allowAnyPath,
        }),
    );
    return SafeAccess.layer(accessors);
}
