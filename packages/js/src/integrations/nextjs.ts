import { SafeAccess } from '../safe-access';
import type { AbstractAccessor } from '../core/abstract-accessor';

/**
 * Options for {@link loadConfig}.
 */
export interface SafeAccessNextOptions {
    /** Path to the configuration file. Format is auto-detected from the extension. */
    readonly filePath: string;
    /** Explicit format override (e.g. `'json'`, `'yaml'`). */
    readonly format?: string;
    /** Allowed directories for file access (security restriction). */
    readonly allowedDirs?: string[];
    /** Set to `true` to bypass path restrictions when no `allowedDirs` are configured. */
    readonly allowAnyPath?: boolean;
}

/**
 * Loads a configuration file and returns a SafeAccess accessor.
 *
 * Designed for use in Next.js server-side data fetching functions and server
 * components. Only executes on the server (Node.js) — file I/O is performed
 * by the underlying `SafeAccess.fromFile()` call, which must not be imported
 * in client-side bundles.
 *
 * Usage in `getServerSideProps` / `getStaticProps`:
 * ```ts
 * import { loadConfig } from '@safe-access-inline/safe-access-inline/integrations/nextjs';
 *
 * export async function getServerSideProps() {
 *   const config = await loadConfig({ filePath: './config/app.json' });
 *   return {
 *     props: { port: config.getInt('server.port', 3000) },
 *   };
 * }
 * ```
 *
 * Usage in Next.js server components (App Router):
 * ```ts
 * import { loadConfig } from '@safe-access-inline/safe-access-inline/integrations/nextjs';
 *
 * export default async function Page() {
 *   const config = await loadConfig({ filePath: './config/app.json' });
 *   return <div>{config.getString('app.title')}</div>;
 * }
 * ```
 *
 * @param options - File path and optional format/security settings.
 * @returns A resolved {@link AbstractAccessor} wrapping the config data.
 * @throws {@link Error} When the file does not exist or cannot be read.
 * @throws {@link SecurityError} When the path is outside allowed directories.
 */
export async function loadConfig(options: SafeAccessNextOptions): Promise<AbstractAccessor> {
    return SafeAccess.fromFile(options.filePath, {
        format: options.format,
        allowedDirs: options.allowedDirs,
        allowAnyPath: options.allowAnyPath,
    });
}
