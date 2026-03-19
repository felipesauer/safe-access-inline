import type { stringify as tomlStringify } from 'smol-toml';
import { optionalRequire } from '../core/io/optional-require';
import type { SerializerPlugin } from '../core/registries/plugin-registry';

const getSmolToml = optionalRequire<{ stringify: typeof tomlStringify }>('smol-toml', 'TOML');

/**
 * TOML serializer plugin using smol-toml.
 *
 * @example
 * import { PluginRegistry, SmolTomlSerializer } from '@safe-access-inline/safe-access-inline';
 *
 * PluginRegistry.registerSerializer('toml', new SmolTomlSerializer());
 */
export class SmolTomlSerializer implements SerializerPlugin {
    serialize(data: Record<string, unknown>): string {
        return getSmolToml().stringify(data);
    }
}
