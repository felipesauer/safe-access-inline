import type yaml from 'js-yaml';
import { optionalRequire } from '../core/io/optional-require';
import type { SerializerPlugin } from '../core/registries/plugin-registry';

const getYaml = optionalRequire<typeof yaml>('js-yaml', 'YAML');

/**
 * YAML serializer plugin using js-yaml.
 *
 * @example
 * import { PluginRegistry, JsYamlSerializer } from '@safe-access-inline/safe-access-inline';
 *
 * PluginRegistry.registerSerializer('yaml', new JsYamlSerializer());
 */
export class JsYamlSerializer implements SerializerPlugin {
    /**
     * @param indent - Number of spaces to use for indentation (default: `2`).
     * @param lineWidth - Maximum line width; `-1` disables wrapping (default: `-1`).
     */
    constructor(
        private readonly indent: number = 2,
        private readonly lineWidth: number = -1,
    ) {}

    /**
     * Serialises a plain record to a YAML string using js-yaml.
     *
     * @param data - The record to serialise.
     * @returns A YAML-formatted string.
     */
    serialize(data: Record<string, unknown>): string {
        return getYaml().dump(data, {
            indent: this.indent,
            lineWidth: this.lineWidth,
        });
    }
}
