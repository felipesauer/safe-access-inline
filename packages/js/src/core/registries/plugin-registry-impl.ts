import { UnsupportedTypeError } from '../../exceptions/unsupported-type.error';
import { AuditEventType, emitAudit } from '../../security/audit/audit-emitter';
import { DEFAULT_PLUGIN_REGISTRY_CONFIG } from '../config/plugin-registry-config';
import type {
    IPluginRegistry,
    ParserPlugin,
    SerializerPlugin,
} from '../../contracts/plugin-registry.contract';

/**
 * Concrete, instantiable implementation of {@link IPluginRegistry}.
 *
 * Used internally by the global {@link PluginRegistry} static facade and by
 * isolated instances created via {@link PluginRegistry.create} for DI / testing.
 *
 * @internal
 */
export class PluginRegistryImpl implements IPluginRegistry {
    private parsers = new Map<string, ParserPlugin>();
    private serializers = new Map<string, SerializerPlugin>();
    private readonly MAX_PARSERS: number;
    private readonly MAX_SERIALIZERS: number;

    constructor(config = DEFAULT_PLUGIN_REGISTRY_CONFIG) {
        this.MAX_PARSERS = config.maxParsers;
        this.MAX_SERIALIZERS = config.maxSerializers;
    }

    // ── Parsers ──

    /** Registers (or overwrites) a parser plugin for the given `format`. */
    registerParser(format: string, parser: ParserPlugin): void {
        if (!this.parsers.has(format) && this.parsers.size >= this.MAX_PARSERS) {
            throw new RangeError(
                `Max parser plugins (${this.MAX_PARSERS}) reached. ` +
                    `Call PluginRegistry.reset() to clear before registering new formats.`,
            );
        }
        if (this.parsers.has(format)) {
            emitAudit(AuditEventType.PLUGIN_OVERWRITE, {
                kind: 'parser',
                format,
                message: `Parser for format '${format}' is being overwritten.`,
            });
        }
        this.parsers.set(format, parser);
    }

    /** Returns `true` if a parser is registered for `format`. */
    hasParser(format: string): boolean {
        return this.parsers.has(format);
    }

    /**
     * Returns the registered parser for `format`.
     * @throws {@link UnsupportedTypeError} When no parser is registered.
     */
    getParser(format: string): ParserPlugin {
        const parser = this.parsers.get(format);
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
    registerSerializer(format: string, serializer: SerializerPlugin): void {
        if (!this.serializers.has(format) && this.serializers.size >= this.MAX_SERIALIZERS) {
            throw new RangeError(
                `Max serializer plugins (${this.MAX_SERIALIZERS}) reached. ` +
                    `Call PluginRegistry.reset() to clear before registering new formats.`,
            );
        }
        if (this.serializers.has(format)) {
            emitAudit(AuditEventType.PLUGIN_OVERWRITE, {
                kind: 'serializer',
                format,
                message: `Serializer for format '${format}' is being overwritten.`,
            });
        }
        this.serializers.set(format, serializer);
    }

    /** Returns `true` if a serializer is registered for `format`. */
    hasSerializer(format: string): boolean {
        return this.serializers.has(format);
    }

    /**
     * Returns the registered serializer for `format`.
     * @throws {@link UnsupportedTypeError} When no serializer is registered.
     */
    getSerializer(format: string): SerializerPlugin {
        const serializer = this.serializers.get(format);
        if (!serializer) {
            throw new UnsupportedTypeError(
                `No serializer registered for format '${format}'. ` +
                    `Register one with: PluginRegistry.registerSerializer('${format}', { serialize: (data) => ... })`,
            );
        }
        return serializer;
    }

    /** Removes all registered parsers and serializers. */
    reset(): void {
        this.parsers.clear();
        this.serializers.clear();
    }
}
