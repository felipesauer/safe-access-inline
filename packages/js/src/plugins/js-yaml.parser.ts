import yaml from 'js-yaml';
import type { ParserPlugin } from '../core/plugin-registry';

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
        return (yaml.load(raw) as Record<string, unknown>) ?? {};
    }
}
