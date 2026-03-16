import type yaml from 'js-yaml';
import { optionalRequire } from '../core/optional-require';
import type { ParserPlugin } from '../core/plugin-registry';

const getYaml = optionalRequire<typeof yaml>('js-yaml', 'YAML');

/**
 * YAML parser plugin using js-yaml.
 *
 * @example
 * import { PluginRegistry, JsYamlParser } from '@safe-access-inline/safe-access-inline';
 *
 * PluginRegistry.registerParser('yaml', new JsYamlParser());
 */
export class JsYamlParser implements ParserPlugin {
    parse(raw: string): Record<string, unknown> {
        return (getYaml().load(raw) as Record<string, unknown>) ?? {};
    }
}
