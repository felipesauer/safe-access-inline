import { SafeAccess } from '../safe-access';
import type { AbstractAccessor } from '../core/abstract-accessor';

/**
 * Minimal subset of the Express `Request` interface.
 *
 * Structurally compatible with `express.Request` from `@types/express` so that
 * consuming projects with Express installed experience full type safety, while
 * projects without it still compile without errors.
 */
interface SafeAccessRequest {
    [key: string]: unknown;
}

/**
 * Minimal subset of the Express `Response` interface.
 */
interface SafeAccessResponse {
    [key: string]: unknown;
}

/**
 * Callback passed to an Express middleware function.
 *
 * Calling `next()` advances the middleware chain; calling `next(err)` delegates
 * to Express's error-handling middleware.
 */
type NextFunction = (err?: unknown) => void;

/**
 * A standard Express `RequestHandler` signature.
 *
 * Returned by {@link safeAccessMiddleware}, compatible with `express.RequestHandler`.
 */
export type RequestHandler = (
    req: SafeAccessRequest,
    res: SafeAccessResponse,
    next: NextFunction,
) => void;

/**
 * Options for {@link safeAccessMiddleware}.
 */
export interface SafeAccessExpressOptions {
    /** Path to the configuration file. Format is auto-detected from the extension. */
    readonly filePath: string;
    /** Explicit format override (e.g. `'json'`, `'yaml'`). */
    readonly format?: string;
    /** Property name to attach the accessor to on `req`. Defaults to `'config'`. */
    readonly attachAs?: string;
    /** Allowed directories for file access (security restriction). */
    readonly allowedDirs?: string[];
    /** Set to `true` to bypass path restrictions when no `allowedDirs` are configured. */
    readonly allowAnyPath?: boolean;
}

/**
 * Express middleware that loads a config file **once** at middleware creation
 * time and attaches the resulting accessor to `req[attachAs]` on every request.
 *
 * The config file is never reloaded per-request. For hot-reload behaviour, use
 * {@link SafeAccess.watchFile} separately to rebuild the middleware.
 *
 * Load errors are propagated via `next(err)` on the first request rather than
 * crashing on startup, so Express's error-handling middleware can intercept them.
 *
 * Usage:
 * ```ts
 * import express from 'express';
 * import { safeAccessMiddleware } from '@safe-access-inline/safe-access-inline/integrations/express';
 *
 * const app = express();
 * app.use(safeAccessMiddleware({ filePath: './config/app.json' }));
 *
 * app.get('/', (req, res) => {
 *   const port = (req as any).config.getInt('server.port', 3000);
 *   res.json({ port });
 * });
 * ```
 *
 * @param options - Middleware configuration.
 * @returns An Express `RequestHandler`.
 */
export function safeAccessMiddleware(options: SafeAccessExpressOptions): RequestHandler {
    let accessor: AbstractAccessor;
    let loadError: unknown;

    try {
        accessor = SafeAccess.fromFileSync(options.filePath, {
            format: options.format,
            allowedDirs: options.allowedDirs,
            allowAnyPath: options.allowAnyPath,
        });
    } catch (err) {
        loadError = err;
    }

    const key = options.attachAs ?? 'config';

    return (req: SafeAccessRequest, _res: SafeAccessResponse, next: NextFunction): void => {
        if (loadError !== undefined) {
            next(loadError);
            return;
        }
        req[key] = accessor;
        next();
    };
}
