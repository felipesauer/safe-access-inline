import yaml from 'js-yaml';
import { AbstractAccessor } from '../core/abstract-accessor';
import { PluginRegistry } from '../core/plugin-registry';
import { InvalidFormatError } from '../exceptions/invalid-format.error';

/**
 * Accessor for YAML strings.
 * Uses js-yaml by default, with optional plugin override via PluginRegistry.
 */
export class YamlAccessor<
    T extends Record<string, unknown> = Record<string, unknown>,
> extends AbstractAccessor<T> {
    static from(data: unknown): YamlAccessor {
        if (typeof data !== 'string') {
            throw new InvalidFormatError('YamlAccessor expects a YAML string.');
        }
        return new YamlAccessor(data);
    }

    protected parse(raw: unknown): Record<string, unknown> {
        const input = raw as string;

        if (PluginRegistry.hasParser('yaml')) {
            return PluginRegistry.getParser('yaml').parse(input);
        }

        try {
            return (
                (yaml.load(input, { schema: yaml.JSON_SCHEMA }) as Record<string, unknown>) ?? {}
            );
        } catch {
            /* v8 ignore next */
            throw new InvalidFormatError('YamlAccessor failed to parse YAML string.');
        }
    }

    clone(data: Record<string, unknown>): YamlAccessor<T> {
        const inst = Object.create(YamlAccessor.prototype) as YamlAccessor<T>;
        inst.raw = this.raw;
        inst.data = data;
        return inst;
    }
}
