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
 * Contract for a plugin registry that stores parser and serializer plugins.
 *
 * Both the global-singleton `PluginRegistry` (static facade) and any
 * isolated instance created via `PluginRegistry.create()` satisfy this interface,
 * enabling dependency-injection in tests and library extensions.
 */
export interface IPluginRegistry {
    /** Registers (or overwrites) a parser plugin for the given `format`. */
    registerParser(format: string, parser: ParserPlugin): void;

    /** Returns `true` if a parser is registered for `format`. */
    hasParser(format: string): boolean;

    /**
     * Returns the registered parser for `format`.
     * @throws {@link UnsupportedTypeError} When no parser is registered.
     */
    getParser(format: string): ParserPlugin;

    /** Registers (or overwrites) a serializer plugin for the given `format`. */
    registerSerializer(format: string, serializer: SerializerPlugin): void;

    /** Returns `true` if a serializer is registered for `format`. */
    hasSerializer(format: string): boolean;

    /**
     * Returns the registered serializer for `format`.
     * @throws {@link UnsupportedTypeError} When no serializer is registered.
     */
    getSerializer(format: string): SerializerPlugin;

    /** Removes all registered parsers and serializers. */
    reset(): void;
}
