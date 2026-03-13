import { stringify } from 'smol-toml';
import type { SerializerPlugin } from '../core/plugin-registry';

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
        return stringify(data);
    }
}
