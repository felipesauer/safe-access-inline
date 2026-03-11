import { UnsupportedTypeError } from '../exceptions/unsupported-type.error';

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

  static registerParser(format: string, parser: ParserPlugin): void {
    PluginRegistry.parsers.set(format, parser);
  }

  static hasParser(format: string): boolean {
    return PluginRegistry.parsers.has(format);
  }

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

  static registerSerializer(format: string, serializer: SerializerPlugin): void {
    PluginRegistry.serializers.set(format, serializer);
  }

  static hasSerializer(format: string): boolean {
    return PluginRegistry.serializers.has(format);
  }

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

  static reset(): void {
    PluginRegistry.parsers.clear();
    PluginRegistry.serializers.clear();
  }
}
