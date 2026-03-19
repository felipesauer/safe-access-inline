import type { parse as tomlParse } from 'smol-toml';
import { optionalRequire } from '../core/io/optional-require';
import { AbstractAccessor } from '../core/abstract-accessor';
import { PluginRegistry } from '../core/registries/plugin-registry';
import { InvalidFormatError } from '../exceptions/invalid-format.error';

const getSmolToml = optionalRequire<{ parse: typeof tomlParse }>('smol-toml', 'TOML');

/**
 * Accessor for TOML strings.
 * Uses smol-toml by default, with optional plugin override via PluginRegistry.
 */
export class TomlAccessor<
    T extends Record<string, unknown> = Record<string, unknown>,
> extends AbstractAccessor<T> {
    /** Creates an accessor from a TOML string. */
    static from(data: unknown): TomlAccessor {
        if (typeof data !== 'string') {
            throw new InvalidFormatError('TomlAccessor expects a TOML string.');
        }
        return new TomlAccessor(data);
    }

    protected parse(raw: unknown): Record<string, unknown> {
        const input = raw as string;

        if (PluginRegistry.hasParser('toml')) {
            return PluginRegistry.getParser('toml').parse(input);
        }

        try {
            return getSmolToml().parse(input) as Record<string, unknown>;
        } catch {
            throw new InvalidFormatError('TomlAccessor failed to parse TOML string.');
        }
    }

    clone(data: Record<string, unknown>): TomlAccessor<T> {
        const inst = Object.create(TomlAccessor.prototype) as TomlAccessor<T>;
        inst.raw = this.raw;
        inst.data = data;
        return inst;
    }
}
