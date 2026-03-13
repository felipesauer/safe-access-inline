import yaml from 'js-yaml';
import { stringify as tomlStringify } from 'smol-toml';
import { DotNotationParser } from './dot-notation-parser';
import { PluginRegistry } from './plugin-registry';
import type { AccessorInterface } from '../contracts/accessor.interface';
import { InvalidFormatError } from '../exceptions/invalid-format.error';
import { UnsupportedTypeError } from '../exceptions/unsupported-type.error';

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

    toToml(): string {
        if (PluginRegistry.hasSerializer('toml')) {
            return PluginRegistry.getSerializer('toml').serialize(this.data);
        }

        try {
            return tomlStringify(this.data);
        } catch (e) {
            throw new InvalidFormatError(
                /* v8 ignore next */
                `toToml() failed to serialize data: ${e instanceof Error ? e.message : String(e)}`,
            );
        }
    }

    toYaml(): string {
        if (PluginRegistry.hasSerializer('yaml')) {
            return PluginRegistry.getSerializer('yaml').serialize(this.data);
        }

        return yaml.dump(this.data);
    }

    toXml(rootElement = 'root'): string {
        if (!/^[a-zA-Z_][\w.-]*$/.test(rootElement)) {
            throw new InvalidFormatError(`Invalid XML root element name: '${rootElement}'`);
        }

        if (PluginRegistry.hasSerializer('xml')) {
            return PluginRegistry.getSerializer('xml').serialize(this.data);
        }

        throw new UnsupportedTypeError(
            'toXml() requires an XML serializer plugin. ' +
                "Register with: PluginRegistry.registerSerializer('xml', { serialize: (data) => ... })",
        );
    }

    transform(format: string): string {
        if (PluginRegistry.hasSerializer(format)) {
            return PluginRegistry.getSerializer(format).serialize(this.data);
        }

        // Fall back to built-in serializers for YAML and TOML
        if (format === 'yaml') return this.toYaml();
        if (format === 'toml') return this.toToml();

        return PluginRegistry.getSerializer(format).serialize(this.data);
    }
}
