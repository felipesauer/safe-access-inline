import type yaml from 'js-yaml';
import { optionalRequire } from '../core/io/optional-require';
import { AbstractAccessor } from '../core/abstract-accessor';
import { PluginRegistry } from '../core/registries/plugin-registry';
import { InvalidFormatError } from '../exceptions/invalid-format.error';

const getYaml = optionalRequire<typeof yaml>('js-yaml', 'YAML');

/**
 * Accessor for YAML strings.
 * Uses js-yaml by default, with optional plugin override via PluginRegistry.
 */
export class YamlAccessor<
    T extends Record<string, unknown> = Record<string, unknown>,
> extends AbstractAccessor<T> {
    /** Creates an accessor from a YAML string. */
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
                (getYaml().load(input, { schema: getYaml().JSON_SCHEMA }) as Record<
                    string,
                    unknown
                >) ?? {}
            );
        } catch {
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
