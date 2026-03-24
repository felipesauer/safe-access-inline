import type { parse as tomlParse } from 'smol-toml';
import { optionalRequire } from '../core/utils/optional-require';
import { AbstractAccessor } from '../core/abstract-accessor';
import { PluginRegistry } from '../core/registries/plugin-registry';
import { InvalidFormatError } from '../exceptions/invalid-format.error';

const getSmolToml = optionalRequire<{
    parse: typeof tomlParse;
    stringify: (data: Record<string, unknown>) => string;
}>('smol-toml', 'TOML');

/**
 * Accessor for TOML strings.
 * Uses smol-toml by default, with optional plugin override via PluginRegistry.
 */
export class TomlAccessor<
    T extends Record<string, unknown> = Record<string, unknown>,
> extends AbstractAccessor<T> {
    /**
     * Creates an accessor from a TOML string.
     *
     * @param data - A valid TOML string.
     * @returns A new {@link TomlAccessor} instance.
     * @throws {InvalidFormatError} If `data` is not a string or fails to parse.
     */
    static from(data: unknown, options?: { readonly?: boolean }): TomlAccessor {
        if (typeof data !== 'string') {
            throw new InvalidFormatError('TomlAccessor expects a TOML string.');
        }
        return new TomlAccessor(data, options);
    }

    /**
     * Parses a TOML string into a plain record.
     *
     * @param raw - The raw TOML string.
     * @returns A plain record from the parsed TOML.
     * @throws {InvalidFormatError} If the string is not valid TOML.
     */
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

    /**
     * Returns a new {@link TomlAccessor} wrapping the given data.
     *
     * @param data - The record to wrap.
     * @returns A new {@link TomlAccessor} instance.
     */
    protected override clone(data: Record<string, unknown> = {}): TomlAccessor<T> {
        if (PluginRegistry.hasSerializer('toml')) {
            return new TomlAccessor(
                PluginRegistry.getSerializer('toml').serialize(data),
            ) as TomlAccessor<T>;
        }
        return new TomlAccessor(getSmolToml().stringify(data)) as TomlAccessor<T>;
    }
}
