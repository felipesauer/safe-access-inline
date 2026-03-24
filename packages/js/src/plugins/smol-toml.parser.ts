import type { parse as tomlParse } from 'smol-toml';
import { optionalRequire } from '../core/utils/optional-require';
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
    /**
     * Parses a TOML string into a plain record using smol-toml.
     *
     * @param raw - The TOML string to parse.
     * @returns A plain record of the parsed TOML data.
     */
    parse(raw: string): Record<string, unknown> {
        return getSmolToml().parse(raw) as Record<string, unknown>;
    }
}
