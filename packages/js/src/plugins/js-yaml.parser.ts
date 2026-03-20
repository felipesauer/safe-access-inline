import type yaml from 'js-yaml';
import { optionalRequire } from '../core/io/optional-require';
import type { ParserPlugin } from '../core/registries/plugin-registry';

const getYaml = optionalRequire<typeof yaml>('js-yaml', 'YAML');

/**
 * YAML parser plugin using js-yaml.
 *
 * Loads YAML with the JSON_SCHEMA option, which restricts the document to
 * JSON-compatible types only. This prevents execution of `!!js/function`,
 * `!!js/regexp`, and similar non-standard YAML tags that could lead to
 * arbitrary code execution. This matches the security level of the built-in
 * {@link YamlAccessor}.
 *
 * @example
 * import { PluginRegistry, JsYamlParser } from '@safe-access-inline/safe-access-inline';
 *
 * PluginRegistry.registerParser('yaml', new JsYamlParser());
 */
export class JsYamlParser implements ParserPlugin {
    /**
     * Parses a YAML string into a plain record using js-yaml with `JSON_SCHEMA`.
     *
     * The `JSON_SCHEMA` option limits the recognised YAML tags to those that map
     * to JSON primitives, preventing `!!js/function` and similar dangerous tags.
     *
     * @param raw - The YAML string to parse.
     * @returns A plain record of the parsed YAML data.
     */
    parse(raw: string): Record<string, unknown> {
        const jsyaml = getYaml();
        return (jsyaml.load(raw, { schema: jsyaml.JSON_SCHEMA }) as Record<string, unknown>) ?? {};
    }
}
