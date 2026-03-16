import type yaml from 'js-yaml';
import { optionalRequire } from '../core/optional-require';
import type { SerializerPlugin } from '../core/plugin-registry';

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
    constructor(
        private readonly indent: number = 2,
        private readonly lineWidth: number = -1,
    ) {}

    serialize(data: Record<string, unknown>): string {
        return getYaml().dump(data, {
            indent: this.indent,
            lineWidth: this.lineWidth,
        });
    }
}
