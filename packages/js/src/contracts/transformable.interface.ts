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
     * @param pretty - Whether to pretty-print with indentation.
     * @returns JSON string.
     */
    toJson(pretty?: boolean): string;

    /**
     * Returns the data as a plain object (alias of {@link toArray}).
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
     * @param csvMode - Formula injection handling: `'none'` (no protection), `'prefix'` (tab-prefix),
     *                  `'strip'` (remove leading chars), `'error'` (throw on formula).
     * @returns CSV string.
     */
    toCsv(csvMode?: 'none' | 'prefix' | 'strip' | 'error'): string;

    /**
     * Serialises data to NDJSON (newline-delimited JSON) format.
     *
     * @returns An NDJSON-formatted string.
     */
    toNdjson(): string;

    /**
     * Transforms data using a registered serializer plugin.
     *
     * @param format - Format identifier (e.g. `'yaml'`, `'xml'`).
     * @returns Serialised string.
     * @throws {@link UnsupportedTypeError} If no serializer is registered for the format.
     */
    transform(format: string): string;
}
