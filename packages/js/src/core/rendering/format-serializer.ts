import type yaml from 'js-yaml';
import type { stringify as tomlStringify } from 'smol-toml';
import { optionalRequire } from '../io/optional-require';
import { PluginRegistry } from '../registries/plugin-registry';
import { InvalidFormatError } from '../../exceptions/invalid-format.error';
import { getGlobalPolicy } from '../../security/guards/security-policy';
import { sanitizeCsvCell } from '../../security/sanitizers/csv-sanitizer';
import { emitAudit } from '../../security/audit/audit-emitter';

const getYaml = optionalRequire<typeof yaml>('js-yaml', 'YAML');
const getSmolToml = optionalRequire<{ stringify: typeof tomlStringify }>('smol-toml', 'TOML');

/**
 * Stateless format serialisation helpers.
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
     * @returns TOML string.
     * @throws {@link InvalidFormatError} When serialisation fails.
     */
    static toToml(data: Record<string, unknown>): string {
        if (PluginRegistry.hasSerializer('toml')) {
            return PluginRegistry.getSerializer('toml').serialize(data);
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
     * @returns YAML string.
     */
    static toYaml(data: Record<string, unknown>): string {
        if (PluginRegistry.hasSerializer('yaml')) {
            return PluginRegistry.getSerializer('yaml').serialize(data);
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
     * @returns XML string including the `<?xml …?>` declaration.
     * @throws {@link InvalidFormatError} When `rootElement` contains invalid characters.
     */
    static toXml(data: Record<string, unknown>, rootElement = 'root'): string {
        if (!/^[a-zA-Z_][\w.-]*$/.test(rootElement)) {
            throw new InvalidFormatError(`Invalid XML root element name: '${rootElement}'`);
        }
        if (PluginRegistry.hasSerializer('xml')) {
            return PluginRegistry.getSerializer('xml').serialize(data);
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
            emitAudit('security.deprecation', {
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
     * Dispatches to the appropriate serializer for `format`.
     *
     * Plugin-registered serializers take priority; built-in serializers are used
     * as fallback for `yaml`, `toml`, and `csv`.
     *
     * @param data - Data record to serialise.
     * @param format - Target format identifier.
     * @returns Serialised string.
     */
    static transform(data: Record<string, unknown>, format: string): string {
        if (PluginRegistry.hasSerializer(format)) {
            return PluginRegistry.getSerializer(format).serialize(data);
        }
        if (format === 'yaml') return FormatSerializer.toYaml(data);
        if (format === 'toml') return FormatSerializer.toToml(data);
        if (format === 'csv') return FormatSerializer.toCsv(data);
        return PluginRegistry.getSerializer(format).serialize(data);
    }

    // ── Private helpers ─────────────────────────────

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
