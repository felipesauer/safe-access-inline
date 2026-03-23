import { AbstractAccessor } from '../core/abstract-accessor';
import { InvalidFormatError } from '../exceptions/invalid-format.error';

/**
 * Accessor for .env format strings (KEY=VALUE per line).
 * Supports: comments (#), quoted values, blank lines.
 */
export class EnvAccessor<
    T extends Record<string, unknown> = Record<string, unknown>,
> extends AbstractAccessor<T> {
    /**
     * Creates an accessor from a `.env`-format string.
     *
     * @param data - A valid `.env` string (KEY=VALUE per line).
     * @returns A new {@link EnvAccessor} instance.
     * @throws {InvalidFormatError} If `data` is not a string.
     */
    static from(data: unknown, options?: { readonly?: boolean }): EnvAccessor {
        if (typeof data !== 'string') {
            throw new InvalidFormatError('EnvAccessor expects an ENV string.');
        }
        return new EnvAccessor(data, options);
    }

    /**
     * Parses a `.env`-format string into a plain record.
     * Strips comments, blank lines, and surrounding quotes.
     *
     * @param raw - The raw `.env` string.
     * @returns A plain record of environment variable key/value pairs.
     */
    protected parse(raw: unknown): Record<string, unknown> {
        const env = raw as string;
        const result: Record<string, unknown> = {};

        for (const rawLine of env.split('\n')) {
            const line = rawLine.trim();

            // Skip empty lines and comments
            if (line === '' || line.startsWith('#')) {
                continue;
            }

            const eqPos = line.indexOf('=');
            if (eqPos === -1) continue;

            const key = line.substring(0, eqPos).trim();
            let value: string = line.substring(eqPos + 1).trim();

            // Remove surrounding quotes
            if (
                (value.startsWith('"') && value.endsWith('"')) ||
                (value.startsWith("'") && value.endsWith("'"))
            ) {
                value = value.slice(1, -1);
            }

            result[key] = value;
        }

        return result;
    }

    /**
     * Returns a new {@link EnvAccessor} wrapping the given data.
     *
     * @param data - The record to wrap.
     * @returns A new {@link EnvAccessor} instance.
     */
    clone(data: Record<string, unknown>): EnvAccessor<T> {
        const inst = Object.create(EnvAccessor.prototype) as EnvAccessor<T>;
        inst.raw = this.raw;
        inst.data = data;
        return inst;
    }
}
