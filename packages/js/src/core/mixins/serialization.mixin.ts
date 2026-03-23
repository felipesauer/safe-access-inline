import { TypeCastingMixin } from './type-casting.mixin';
import { FormatSerializer } from '../rendering/format-serializer';

/**
 * @internal
 * Abstract mixin providing format serialization wrappers for {@link AbstractAccessor} subclasses.
 *
 * Every method delegates to {@link FormatSerializer}; the mixin is responsible only
 * for forwarding `this.data` to the appropriate serializer.
 *
 * Extracted from `abstract-accessor.ts` to separate concerns.
 * Do not extend this class directly — use {@link AbstractAccessor}.
 */
export abstract class SerializationMixin extends TypeCastingMixin {
    /**
     * Serialises the data to TOML. Requires `smol-toml` or a registered TOML plugin.
     *
     * @returns TOML-encoded string.
     */
    toToml(): string {
        return FormatSerializer.toToml(this.data);
    }

    /**
     * Serialises the data to YAML. Requires `js-yaml` or a registered YAML plugin.
     *
     * @returns YAML-encoded string.
     */
    toYaml(): string {
        return FormatSerializer.toYaml(this.data);
    }

    /**
     * Serialises the data to XML.
     *
     * @param rootElement - Name of the XML root element (default `'root'`).
     * @returns XML-encoded string.
     */
    toXml(rootElement = 'root'): string {
        return FormatSerializer.toXml(this.data, rootElement);
    }

    /**
     * Serialises the data to CSV.
     *
     * @param csvMode - Injection-prevention mode (`'none'`, `'prefix'`, `'strip'`, or `'error'`).
     * @returns CSV-encoded string.
     */
    toCsv(csvMode?: 'none' | 'prefix' | 'strip' | 'error'): string {
        return FormatSerializer.toCsv(this.data, csvMode);
    }

    /**
     * Serialises the data to newline-delimited JSON (NDJSON).
     *
     * @returns One JSON object per line.
     */
    toNdjson(): string {
        return FormatSerializer.toNdjson(this.data);
    }

    /**
     * Serialises the data to INI format.
     *
     * Top-level scalar values become `key = value` pairs; top-level plain objects become
     * `[section]` blocks. Deeper nesting is serialised as a JSON string value.
     *
     * @returns INI-formatted string.
     */
    toIni(): string {
        return FormatSerializer.toIni(this.data);
    }

    /**
     * Serialises the data to `.env` format.
     *
     * Only flat (non-object) top-level values are emitted. Nested objects are skipped silently.
     *
     * @remarks
     * ENV values are always strings. Typed values (booleans, numbers) are coerced via `String()`,
     * so a round-trip through `toEnv → EnvAccessor.from` produces string values rather than the
     * original typed primitives.
     *
     * @returns ENV-formatted string.
     */
    toEnv(): string {
        return FormatSerializer.toEnv(this.data);
    }

    /**
     * Dispatches serialisation to the plugin registered for `format`.
     *
     * @param format - Target format name (e.g. `'ini'`, `'env'`).
     * @returns The serialised string.
     * @throws {@link Error} When no serializer is registered for `format`.
     */
    transform(format: string): string {
        return FormatSerializer.transform(this.data, format);
    }
}
