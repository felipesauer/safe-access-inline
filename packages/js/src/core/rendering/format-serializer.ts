import type yaml from 'js-yaml';
import type { stringify as tomlStringify } from 'smol-toml';
import { optionalRequire } from '../io/optional-require';
import { PluginRegistry } from '../registries/plugin-registry';
import type { IPluginRegistry } from '../../contracts/plugin-registry.contract';
import { InvalidFormatError } from '../../exceptions/invalid-format.error';
import { UnsupportedTypeError } from '../../exceptions/unsupported-type.error';
import { getGlobalPolicy } from '../../security/guards/security-policy';
import { sanitizeCsvCell } from '../../security/sanitizers/csv-sanitizer';
import { AuditEventType, emitAudit } from '../../security/audit/audit-emitter';

const getYaml = optionalRequire<typeof yaml>('js-yaml', 'YAML');
const getSmolToml = optionalRequire<{ stringify: typeof tomlStringify }>('smol-toml', 'TOML');

/**
 * Stateless format serialization helpers.
 *
 * This module is the TypeScript equivalent of the PHP `HasTransformations` trait.
 * Every method receives the data record as its first argument and returns a string.
 */
export class FormatSerializer {
    /**
     * Serialises data to TOML.
     *
     * Prefers a plugin-registered serializer; falls back to `smol-toml`.
     *
     * @param data - Data record to serialise.
     * @param registry - Plugin registry to query. Defaults to the global default registry.
     * @returns TOML string.
     * @throws {@link InvalidFormatError} When serialization fails.
     */
    static toToml(
        data: Record<string, unknown>,
        registry: IPluginRegistry = PluginRegistry.getDefault(),
    ): string {
        if (registry.hasSerializer('toml')) {
            return registry.getSerializer('toml').serialize(data);
        }
        try {
            return getSmolToml().stringify(data);
        } catch (e) {
            throw new InvalidFormatError(`toToml() failed to serialize data: ${String(e)}`);
        }
    }

    /**
     * Serialises data to YAML.
     *
     * Prefers a plugin-registered serializer; falls back to `js-yaml`.
     *
     * @param data - Data record to serialise.
     * @param registry - Plugin registry to query. Defaults to the global default registry.
     * @returns YAML string.
     */
    static toYaml(
        data: Record<string, unknown>,
        registry: IPluginRegistry = PluginRegistry.getDefault(),
    ): string {
        if (registry.hasSerializer('yaml')) {
            return registry.getSerializer('yaml').serialize(data);
        }
        return getYaml().dump(data);
    }

    /**
     * Serialises data to XML.
     *
     * Prefers a plugin-registered serializer; falls back to a built-in recursive builder.
     *
     * @param data - Data record to serialise.
     * @param rootElement - Name of the XML root element (default `'root'`).
     * @param registry - Plugin registry to query. Defaults to the global default registry.
     * @returns XML string including the `<?xml …?>` declaration.
     * @throws {@link InvalidFormatError} When `rootElement` contains invalid characters.
     */
    static toXml(
        data: Record<string, unknown>,
        rootElement = 'root',
        registry: IPluginRegistry = PluginRegistry.getDefault(),
    ): string {
        if (!/^[a-zA-Z_][\w.-]*$/.test(rootElement)) {
            throw new InvalidFormatError(`Invalid XML root element name: '${rootElement}'`);
        }
        if (registry.hasSerializer('xml')) {
            return registry.getSerializer('xml').serialize(data);
        }
        return `<?xml version="1.0"?>\n<${rootElement}>${FormatSerializer.objectToXml(data)}</${rootElement}>\n`;
    }

    /**
     * Serialises tabular data to CSV.
     *
     * Cell values are sanitised according to the active `csvMode` policy.
     *
     * @param data - Data record whose values are row objects.
     * @param csvMode - Explicit sanitisation mode. When omitted, falls back to the
     *   global security policy's `csvMode`.
     * @returns CSV string with header row and data rows.
     */
    static toCsv(
        data: Record<string, unknown>,
        csvMode?: 'none' | 'prefix' | 'strip' | 'error',
    ): string {
        const mode = csvMode ?? getGlobalPolicy()?.csvMode ?? 'none';
        if (!csvMode && !getGlobalPolicy()?.csvMode) {
            emitAudit(AuditEventType.SECURITY_DEPRECATION, {
                message:
                    "csvMode defaults to 'none' which does not sanitize CSV cells. " +
                    "In a future version, the default will change to 'prefix'. " +
                    'Pass an explicit csvMode to toCsv() or set it via setGlobalPolicy().',
            });
        }

        const rows = Object.values(data);
        if (rows.length === 0) return '';

        const firstRow = rows[0] as Record<string, unknown>;
        const headers = Object.keys(firstRow);
        const sanitize = (cell: string): string => sanitizeCsvCell(cell, mode);
        const escapeCsv = (val: unknown): string => {
            const str = String(val);
            return str.includes(',') || str.includes('"') || str.includes('\n')
                ? `"${str.replace(/"/g, '""')}"`
                : str;
        };

        const lines = [headers.map((h) => escapeCsv(sanitize(h))).join(',')];
        for (const row of rows) {
            const r = row as Record<string, unknown>;
            lines.push(headers.map((h) => escapeCsv(sanitize(String(r[h] ?? '')))).join(','));
        }
        return lines.join('\n');
    }

    /**
     * Serialises data to newline-delimited JSON (NDJSON).
     *
     * Each top-level value is emitted as one JSON line.
     *
     * @param data - Data record to serialise.
     * @returns NDJSON string.
     */
    static toNdjson(data: Record<string, unknown>): string {
        return Object.values(data)
            .map((v) => JSON.stringify(v))
            .join('\n');
    }

    /**
     * Serialises data to INI format.
     *
     * Top-level scalar values are emitted as `key = value` pairs; top-level plain objects are
     * emitted as `[section]` blocks. Deeper nesting is serialised as a JSON string value.
     * Prefers a plugin-registered `'ini'` serializer when available.
     *
     * @param data - Data record to serialise.
     * @returns INI-formatted string.
     */
    static toIni(
        data: Record<string, unknown>,
        registry: IPluginRegistry = PluginRegistry.getDefault(),
    ): string {
        if (registry.hasSerializer('ini')) {
            return registry.getSerializer('ini').serialize(data);
        }
        const flatLines: string[] = [];
        const sectionBlocks: string[] = [];

        for (const [key, value] of Object.entries(data)) {
            if (value !== null && typeof value === 'object' && !Array.isArray(value)) {
                const block: string[] = [`[${key}]`];
                for (const [subKey, subValue] of Object.entries(value as Record<string, unknown>)) {
                    const serialized =
                        subValue !== null && typeof subValue === 'object'
                            ? JSON.stringify(subValue)
                            : subValue;
                    block.push(`${subKey} = ${FormatSerializer.serializeIniValue(serialized)}`);
                }
                sectionBlocks.push(block.join('\n'));
            } else {
                flatLines.push(`${key} = ${FormatSerializer.serializeIniValue(value)}`);
            }
        }

        const parts: string[] = [];
        if (flatLines.length > 0) parts.push(flatLines.join('\n'));
        parts.push(...sectionBlocks);
        return parts.join('\n\n') + '\n';
    }

    /**
     * Serialises data to `.env` format.
     *
     * Only flat (non-object) top-level values are emitted as `KEY=VALUE` pairs.
     * Nested objects are skipped silently — ENV is an inherently flat format.
     * Values containing spaces are wrapped in double quotes.
     * Prefers a plugin-registered `'env'` serializer when available.
     *
     * @param data - Data record to serialise.
     * @returns ENV-formatted string.
     */
    static toEnv(
        data: Record<string, unknown>,
        registry: IPluginRegistry = PluginRegistry.getDefault(),
    ): string {
        if (registry.hasSerializer('env')) {
            return registry.getSerializer('env').serialize(data);
        }
        const lines: string[] = [];
        for (const [key, value] of Object.entries(data)) {
            if (value !== null && typeof value === 'object') {
                continue;
            }
            const str = value == null ? '' : String(value);
            const quotedValue = str.includes(' ') ? `"${str}"` : str;
            lines.push(`${key}=${quotedValue}`);
        }
        return lines.join('\n') + '\n';
    }

    /**
     * Dispatches to the appropriate serializer for `format`.
     *
     * Plugin-registered serializers take priority; built-in serializers are used
     * as fallback for `yaml`, `toml`, `csv`, `ini`, and `env`.
     *
     * @param data - Data record to serialise.
     * @param format - Target format identifier.
     * @returns Serialised string.
     */
    static transform(
        data: Record<string, unknown>,
        format: string,
        registry: IPluginRegistry = PluginRegistry.getDefault(),
    ): string {
        if (registry.hasSerializer(format)) {
            return registry.getSerializer(format).serialize(data);
        }
        if (format === 'yaml') return FormatSerializer.toYaml(data, registry);
        if (format === 'toml') return FormatSerializer.toToml(data, registry);
        if (format === 'csv') return FormatSerializer.toCsv(data);
        if (format === 'ini') return FormatSerializer.toIni(data, registry);
        if (format === 'env') return FormatSerializer.toEnv(data, registry);
        throw new UnsupportedTypeError(`No serializer registered for format '${format}'.`);
    }

    // ── Private helpers ─────────────────────────────

    /**
     * Serialises a scalar INI value to its string representation.
     *
     * Booleans and null are emitted as their INI keyword equivalents (`true`, `false`, `null`).
     * String values containing INI special characters or whitespace are wrapped in double quotes,
     * unless they already contain a `"` character (which would make quoting ambiguous).
     *
     * @param value - Scalar value to serialise.
     * @returns INI-safe string representation.
     */
    private static serializeIniValue(value: unknown): string {
        if (value === true) return 'true';
        if (value === false) return 'false';
        if (value === null) return 'null';
        if (typeof value === 'number') return String(value);
        const str = String(value);
        if (/[=;#[\]\s]/.test(str) && !str.includes('"')) {
            return `"${str}"`;
        }
        return str;
    }

    /**
     * Escapes the five XML special characters.
     *
     * @param value - Raw string to escape.
     * @returns XML-safe string.
     */
    private static escapeXml(value: string): string {
        return value
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&apos;');
    }

    /**
     * Recursively converts a data record to XML inner content.
     *
     * @param data - Object to convert.
     * @returns XML string without root wrapper.
     */
    private static objectToXml(data: Record<string, unknown>): string {
        let xml = '';
        for (const [key, value] of Object.entries(data)) {
            const safeKey = /^\d+$/.test(key) ? `item_${key}` : key;
            if (value !== null && typeof value === 'object') {
                xml += `<${safeKey}>${FormatSerializer.objectToXml(value as Record<string, unknown>)}</${safeKey}>`;
            } else {
                const strValue =
                    value != null &&
                    (typeof value === 'string' ||
                        typeof value === 'number' ||
                        typeof value === 'boolean')
                        ? String(value)
                        : '';
                xml += `<${safeKey}>${FormatSerializer.escapeXml(strValue)}</${safeKey}>`;
            }
        }
        return xml;
    }
}
