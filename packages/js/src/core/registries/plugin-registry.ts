import { UnsupportedTypeError } from '../../exceptions/unsupported-type.error';
import { AuditEventType, emitAudit } from '../../security/audit/audit-emitter';

/**
 * Contract for parser plugins.
 * A parser converts raw input (string) into a Record.
 */
export interface ParserPlugin {
    parse(raw: string): Record<string, unknown>;
}

/**
 * Contract for serializer plugins.
 * A serializer converts a Record into a formatted string.
 */
export interface SerializerPlugin {
    serialize(data: Record<string, unknown>): string;
}

/**
 * Central registry for parser and serializer plugins.
 * Same architecture as the PHP PluginRegistry.
 */
export class PluginRegistry {
    private static parsers = new Map<string, ParserPlugin>();
    private static serializers = new Map<string, SerializerPlugin>();

    // ── Parsers ──

    /** Registers (or overwrites) a parser plugin for the given `format`. */
    static registerParser(format: string, parser: ParserPlugin): void {
        if (PluginRegistry.parsers.has(format)) {
            emitAudit(AuditEventType.PLUGIN_OVERWRITE, {
                kind: 'parser',
                format,
                message: `Parser for format '${format}' is being overwritten.`,
            });
        }
        PluginRegistry.parsers.set(format, parser);
    }

    /** Returns `true` if a parser is registered for `format`. */
    static hasParser(format: string): boolean {
        return PluginRegistry.parsers.has(format);
    }

    /**
     * Returns the registered parser for `format`.
     * @throws {@link UnsupportedTypeError} When no parser is registered.
     */
    static getParser(format: string): ParserPlugin {
        const parser = PluginRegistry.parsers.get(format);
        if (!parser) {
            throw new UnsupportedTypeError(
                `No parser registered for format '${format}'. ` +
                    `Register one with: PluginRegistry.registerParser('${format}', { parse: (raw) => ... })`,
            );
        }
        return parser;
    }

    // ── Serializers ──

    /** Registers (or overwrites) a serializer plugin for the given `format`. */
    static registerSerializer(format: string, serializer: SerializerPlugin): void {
        if (PluginRegistry.serializers.has(format)) {
            emitAudit(AuditEventType.PLUGIN_OVERWRITE, {
                kind: 'serializer',
                format,
                message: `Serializer for format '${format}' is being overwritten.`,
            });
        }
        PluginRegistry.serializers.set(format, serializer);
    }

    /** Returns `true` if a serializer is registered for `format`. */
    static hasSerializer(format: string): boolean {
        return PluginRegistry.serializers.has(format);
    }

    /**
     * Returns the registered serializer for `format`.
     * @throws {@link UnsupportedTypeError} When no serializer is registered.
     */
    static getSerializer(format: string): SerializerPlugin {
        const serializer = PluginRegistry.serializers.get(format);
        if (!serializer) {
            throw new UnsupportedTypeError(
                `No serializer registered for format '${format}'. ` +
                    `Register one with: PluginRegistry.registerSerializer('${format}', { serialize: (data) => ... })`,
            );
        }
        return serializer;
    }

    // ── Reset (testing) ──

    /** Removes all registered parsers and serializers. Intended for test teardown. */
    static reset(): void {
        PluginRegistry.parsers.clear();
        PluginRegistry.serializers.clear();
    }
}
