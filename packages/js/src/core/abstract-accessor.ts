import { DotNotationParser } from './dot-notation-parser';
import { PluginRegistry } from './plugin-registry';
import { UnsupportedTypeError } from '../exceptions/unsupported-type.error';

export interface AccessorInterface {
  get(path: string, defaultValue?: unknown): unknown;
  getMany(paths: Record<string, unknown>): Record<string, unknown>;
  has(path: string): boolean;
  set(path: string, value: unknown): AbstractAccessor;
  remove(path: string): AbstractAccessor;
  type(path: string): string | null;
  count(path?: string): number;
  keys(path?: string): string[];
  all(): Record<string, unknown>;
  toArray(): Record<string, unknown>;
  toJson(pretty?: boolean): string;
  toObject(): Record<string, unknown>;
  toYaml(): string;
  toXml(rootElement?: string): string;
  transform(format: string): string;
}

export abstract class AbstractAccessor implements AccessorInterface {
  protected data: Record<string, unknown> = {};
  protected raw: unknown;

  constructor(raw: unknown) {
    this.raw = raw;
    this.data = this.parse(raw);
  }

  protected abstract parse(raw: unknown): Record<string, unknown>;
  abstract clone(data: Record<string, unknown>): AbstractAccessor;

  get(path: string, defaultValue: unknown = null): unknown {
    return DotNotationParser.get(this.data, path, defaultValue);
  }

  getMany(paths: Record<string, unknown>): Record<string, unknown> {
    const results: Record<string, unknown> = {};
    for (const [path, defaultValue] of Object.entries(paths)) {
      results[path] = this.get(path, defaultValue);
    }
    return results;
  }

  has(path: string): boolean {
    return DotNotationParser.has(this.data, path);
  }

  set(path: string, value: unknown): AbstractAccessor {
    const newData = DotNotationParser.set(this.data, path, value);
    return this.clone(newData);
  }

  remove(path: string): AbstractAccessor {
    const newData = DotNotationParser.remove(this.data, path);
    return this.clone(newData);
  }

  type(path: string): string | null {
    if (!this.has(path)) return null;
    const val = this.get(path);
    return Array.isArray(val) ? 'array' : typeof val;
  }

  count(path?: string): number {
    const target = path ? this.get(path, []) : this.data;
    if (Array.isArray(target)) return target.length;
    if (typeof target === 'object' && target !== null) return Object.keys(target).length;
    return 0;
  }

  keys(path?: string): string[] {
    const target = path ? this.get(path, {}) : this.data;
    if (typeof target === 'object' && target !== null) return Object.keys(target);
    return [];
  }

  all(): Record<string, unknown> {
    return { ...this.data };
  }

  toArray(): Record<string, unknown> {
    return { ...this.data };
  }

  toJson(pretty = false): string {
    return JSON.stringify(this.data, null, pretty ? 2 : undefined);
  }

  toObject(): Record<string, unknown> {
    return structuredClone(this.data);
  }

  toYaml(): string {
    if (PluginRegistry.hasSerializer('yaml')) {
      return PluginRegistry.getSerializer('yaml').serialize(this.data);
    }

    throw new UnsupportedTypeError(
      "toYaml() requires a YAML serializer plugin. " +
        "Register with: PluginRegistry.registerSerializer('yaml', { serialize: (data) => ... })",
    );
  }

  toXml(rootElement = 'root'): string {
    if (PluginRegistry.hasSerializer('xml')) {
      return PluginRegistry.getSerializer('xml').serialize(this.data);
    }

    throw new UnsupportedTypeError(
      "toXml() requires an XML serializer plugin. " +
        "Register with: PluginRegistry.registerSerializer('xml', { serialize: (data) => ... })",
    );
  }

  transform(format: string): string {
    return PluginRegistry.getSerializer(format).serialize(this.data);
  }
}
