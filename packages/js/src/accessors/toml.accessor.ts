import { AbstractAccessor } from '../core/abstract-accessor';
import { PluginRegistry } from '../core/plugin-registry';
import { InvalidFormatError } from '../exceptions/invalid-format.error';

/**
 * Accessor for TOML strings.
 * Implements a lightweight TOML parser (no external dependencies).
 * Supports: key-value, tables ([table]), quoted strings, booleans, numbers.
 */
export class TomlAccessor extends AbstractAccessor {
  static from(data: unknown): TomlAccessor {
    if (typeof data !== 'string') {
      throw new InvalidFormatError('TomlAccessor expects a TOML string.');
    }
    return new TomlAccessor(data);
  }

  protected parse(raw: unknown): Record<string, unknown> {
    const toml = raw as string;

    // Use registered plugin if available, otherwise fall back to built-in parser
    if (PluginRegistry.hasParser('toml')) {
      return PluginRegistry.getParser('toml').parse(toml);
    }

    try {
      return TomlAccessor.parseToml(toml);
    } catch {
      throw new InvalidFormatError('TomlAccessor failed to parse TOML string.');
    }
  }

  clone(data: Record<string, unknown>): TomlAccessor {
    const inst = Object.create(TomlAccessor.prototype) as TomlAccessor;
    inst.raw = this.raw;
    inst.data = data;
    return inst;
  }

  private static parseToml(toml: string): Record<string, unknown> {
    const result: Record<string, unknown> = {};
    let currentTable: Record<string, unknown> = result;

    for (const rawLine of toml.split('\n')) {
      const line = rawLine.trim();

      // Skip empty lines and comments
      if (line === '' || line.startsWith('#')) continue;

      // Table header [table.name]
      const tableMatch = line.match(/^\[([^\]]+)\]$/);
      if (tableMatch) {
        const tablePath = tableMatch[1].trim().split('.');
        currentTable = result;
        for (const segment of tablePath) {
          if (!(segment in currentTable) || typeof currentTable[segment] !== 'object') {
            currentTable[segment] = {};
          }
          currentTable = currentTable[segment] as Record<string, unknown>;
        }
        continue;
      }

      // Key = Value
      const eqPos = line.indexOf('=');
      if (eqPos === -1) continue;

      const key = line.substring(0, eqPos).trim();
      const valueStr = line.substring(eqPos + 1).trim();
      currentTable[key] = TomlAccessor.coerceValue(valueStr);
    }

    return result;
  }

  private static coerceValue(value: string): unknown {
    if (value === 'true') return true;
    if (value === 'false') return false;

    // String (double or single quoted)
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      return value.slice(1, -1);
    }

    // Array (basic inline)
    if (value.startsWith('[') && value.endsWith(']')) {
      const inner = value.slice(1, -1).trim();
      if (inner === '') return [];
      return inner.split(',').map((item) => TomlAccessor.coerceValue(item.trim()));
    }

    // Number
    if (/^-?\d+$/.test(value)) return parseInt(value, 10);
    if (/^-?\d+\.\d+$/.test(value)) return parseFloat(value);

    return value;
  }
}
