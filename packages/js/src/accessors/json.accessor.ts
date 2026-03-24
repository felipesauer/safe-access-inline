import { AbstractAccessor } from '../core/abstract-accessor';
import { InvalidFormatError } from '../exceptions/invalid-format.error';

/**
 * Accessor for JSON-formatted strings.
 *
 * Parses a raw JSON string into an object and exposes dot-notation
 * read/write operations via {@link AbstractAccessor}.
 *
 * @typeParam T - Shape of the underlying data record.
 */
export class JsonAccessor<
    T extends Record<string, unknown> = Record<string, unknown>,
> extends AbstractAccessor<T> {
    /**
     * Creates an accessor from a JSON string.
     *
     * @param data - A valid JSON string.
     * @returns A new {@link JsonAccessor} instance.
     * @throws {InvalidFormatError} If `data` is not a string or fails to parse.
     */
    static from(data: unknown, options?: { readonly?: boolean }): JsonAccessor {
        if (typeof data !== 'string') {
            throw new InvalidFormatError('JsonAccessor expects a JSON string.');
        }
        return new JsonAccessor(data, options);
    }

    /**
     * Parses a JSON string into a plain record.
     *
     * @param raw - The raw JSON string.
     * @returns A plain record from the parsed JSON.
     * @throws {InvalidFormatError} If the string is not valid JSON.
     */
    protected parse(raw: unknown): Record<string, unknown> {
        try {
            const parsed = JSON.parse(raw as string);
            return typeof parsed === 'object' && parsed !== null ? parsed : {};
        } catch {
            throw new InvalidFormatError('JsonAccessor failed to parse JSON string.');
        }
    }

    /**
     * Returns a new {@link JsonAccessor} wrapping the given data.
     *
     * @param data - The record to wrap.
     * @returns A new {@link JsonAccessor} instance.
     */
    protected override clone(data: Record<string, unknown> = {}): JsonAccessor<T> {
        return new JsonAccessor(JSON.stringify(data)) as JsonAccessor<T>;
    }
}
