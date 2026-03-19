import type { parse as tomlParse } from 'smol-toml';
import { optionalRequire } from '../core/io/optional-require';
import type { ParserPlugin } from '../core/registries/plugin-registry';

const getSmolToml = optionalRequire<{ parse: typeof tomlParse }>('smol-toml', 'TOML');

/**
 * TOML parser plugin using smol-toml.
 *
 * @example
 * import { PluginRegistry, SmolTomlParser } from '@safe-access-inline/safe-access-inline';
 *
 * PluginRegistry.registerParser('toml', new SmolTomlParser());
 */
export class SmolTomlParser implements ParserPlugin {
    parse(raw: string): Record<string, unknown> {
        return getSmolToml().parse(raw) as Record<string, unknown>;
    }
}
