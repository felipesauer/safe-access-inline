import type { CsvMode } from '../enums/csv-mode.enum';

/**
 * Optional output controls for {@link TransformableInterface.toJson}.
 *
 * Mirrors PHP's `toJson()` which always outputs UTF-8 with unicode characters
 * unescaped (PHP `JSON_UNESCAPED_UNICODE`). JS escapes non-ASCII to `\uXXXX`
 * by default; set `unescapeUnicode: true` to replicate PHP's behaviour.
 */
export interface ToJsonOptions {
    /**
     * When `true`, replaces `\uXXXX` escape sequences in the output with their
     * actual Unicode characters — equivalent to PHP's `JSON_UNESCAPED_UNICODE`.
     *
     * @defaultValue false
     */
    readonly unescapeUnicode?: boolean;

    /**
     * When `true`, replaces `\/` with `/` in the output — equivalent to PHP's
     * `JSON_UNESCAPED_SLASHES`.
     *
     * @defaultValue false
     */
    readonly unescapeSlashes?: boolean;

    /**
     * Indentation to use when `pretty` is `true`. Overrides the default of `2`.
     * Accepts a number (spaces) or a string (e.g. `'\t'`).
     *
     * @defaultValue 2
     */
    readonly space?: number | string;
}

/**
 * Contract for serialising data into various output formats.
 *
 * Provides methods for JSON, YAML, TOML, XML, CSV, NDJSON, and
 * plugin-based custom formats via {@link TransformableInterface.transform}.
 */
export interface TransformableInterface {
    /**
     * Returns the data as a plain associative array/object.
     *
     * @returns A plain record of the underlying data.
     */
    toArray(): Record<string, unknown>;

    /**
     * Serialises data to a JSON string.
     *
     * @param pretty - When `true`, output is indented (default: 2 spaces; override via `options.space`).
     * @param options - Optional output controls: unescape unicode/slashes, custom indent.
     * @returns JSON string.
     */
    toJson(pretty?: boolean, options?: ToJsonOptions): string;

    /**
     * Returns the data as a plain object (alias of {@link toArray}).
     *
     * @remarks
     * **Cross-Language Divergence:** In JS/TS, `toObject()` returns a plain associative
     * record (e.g. `Record<string, unknown>`). In PHP, `toObject()` returns a `stdClass`
     * object, which requires property access syntax (`$obj->property`) rather than bracket notation.
     * To get an associative array in PHP, use `toArray()`.
     *
     * @returns A plain record of the underlying data.
     */
    toObject(): Record<string, unknown>;

    /**
     * Serialises data to TOML format. Requires `smol-toml` at runtime.
     *
     * @returns A TOML-formatted string.
     */
    toToml(): string;

    /**
     * Serialises data to YAML format. Requires `js-yaml` at runtime.
     *
     * @returns A YAML-formatted string.
     */
    toYaml(): string;

    /**
     * Serialises data to XML format.
     *
     * @param rootElement - Name of the root XML element (default: `'root'`).
     * @returns XML string.
     */
    toXml(rootElement?: string): string;

    /**
     * Serialises data to CSV format.
     *
     * @param csvMode - Formula injection handling strategy.
     * @returns CSV string.
     */
    toCsv(csvMode?: CsvMode | 'none' | 'prefix' | 'strip' | 'error'): string;

    /**
     * Serialises data to NDJSON (newline-delimited JSON) format.
     *
     * @returns An NDJSON-formatted string.
     */
    toNdjson(): string;

    /**
     * Serialises data to INI format.
     *
     * Top-level scalar values become `key = value` pairs; top-level plain objects become
     * `[section]` blocks. Deeper nesting is serialised as a JSON string value.
     *
     * @returns A valid INI string.
     * @example
     * accessor.toIni(); // "[section]\nkey = value"
     */
    toIni(): string;

    /**
     * Serialises data to `.env` format.
     *
     * Only flat (non-object) top-level values are emitted. Nested objects are skipped silently.
     *
     * @remarks
     * ENV values are always strings. Typed values (booleans, numbers) are coerced via `String()`,
     * so a round-trip through `toEnv → EnvAccessor.from` produces string values rather than the
     * original typed primitives.
     *
     * @returns A valid `.env` string (KEY=VALUE per line).
     * @example
     * accessor.toEnv(); // "APP_NAME=MyApp\nDEBUG=true"
     */
    toEnv(): string;

    /**
     * Transforms data using a registered serializer plugin.
     *
     * @param format - Format identifier (e.g. `'yaml'`, `'xml'`).
     * @returns Serialised string.
     * @throws {@link UnsupportedTypeError} If no serializer is registered for the format.
     */
    transform(format: string): string;
}
