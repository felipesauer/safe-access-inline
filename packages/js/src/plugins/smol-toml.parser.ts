import { parse } from 'smol-toml';
import type { ParserPlugin } from '../core/plugin-registry';

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
        return parse(raw) as Record<string, unknown>;
    }
}
