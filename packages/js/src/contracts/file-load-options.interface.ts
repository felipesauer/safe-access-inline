import type { Format } from '../enums/format.enum';

/**
 * Options for loading data from a local file path.
 *
 * Mirrors the PHP `FileLoadOptions` DTO, extended with JS-specific fields.
 *
 * @example
 * ```typescript
 * const accessor = await SafeAccess.fromFile('./config.json', {
 *   allowedDirs: ['/app/config'],
 *   maxSize: 512_000,
 * });
 * ```
 */
export interface FileLoadOptions {
    /**
     * Explicit format override. When omitted, the format is inferred from the
     * file extension via `resolveFormatFromExtension()`.
     */
    format?: string | Format;

    /**
     * Directories that the resolved file path must reside within.
     *
     * Providing this list enables path-traversal protection. At least one entry
     * is required unless `allowAnyPath` is `true`.
     */
    allowedDirs?: string[];

    /**
     * When `true`, bypasses directory restrictions entirely.
     *
     * Use only in trusted environments (e.g. CLI tools, local scripts).
     * Defaults to `false`.
     */
    allowAnyPath?: boolean;

    /**
     * Maximum file size in bytes. When the file content exceeds this limit,
     * a `SecurityError` is thrown before parsing begins.
     *
     * Defaults to unlimited (no size check).
     */
    maxSize?: number;

    /**
     * File extensions that are permitted to be loaded (e.g. `['.json', '.yaml']`).
     *
     * When provided, loading a file with an extension not in this list throws a
     * `SecurityError`. The check is performed on the original path (before symlink
     * resolution).
     *
     * Defaults to all extensions being allowed.
     */
    allowedExtensions?: string[];
}
