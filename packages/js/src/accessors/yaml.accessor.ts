import type yaml from 'js-yaml';
import { optionalRequire } from '../core/utils/optional-require';
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
    /**
     * Creates an accessor from a YAML string.
     *
     * @param data - A valid YAML string.
     * @returns A new {@link YamlAccessor} instance.
     * @throws {InvalidFormatError} If `data` is not a string or fails to parse.
     */
    static from(data: unknown, options?: { readonly?: boolean }): YamlAccessor {
        if (typeof data !== 'string') {
            throw new InvalidFormatError('YamlAccessor expects a YAML string.');
        }
        return new YamlAccessor(data, options);
    }

    /**
     * Parses a YAML string into a plain record.
     *
     * @param raw - The raw YAML string.
     * @returns A plain record from the parsed YAML.
     * @throws {InvalidFormatError} If the string is not valid YAML.
     */
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

    /**
     * Returns a new {@link YamlAccessor} wrapping the given data.
     *
     * @param data - The record to wrap.
     * @returns A new {@link YamlAccessor} instance.
     */
    protected override clone(data: Record<string, unknown> = {}): YamlAccessor<T> {
        if (PluginRegistry.hasSerializer('yaml')) {
            return new YamlAccessor(
                PluginRegistry.getSerializer('yaml').serialize(data),
            ) as YamlAccessor<T>;
        }
        return new YamlAccessor(getYaml().dump(data)) as YamlAccessor<T>;
    }
}
