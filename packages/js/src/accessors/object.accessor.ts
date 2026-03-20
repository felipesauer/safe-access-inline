import { AbstractAccessor } from '../core/abstract-accessor';
import { InvalidFormatError } from '../exceptions/invalid-format.error';

/**
 * Accessor for plain JavaScript objects.
 *
 * Accepts a non-null object and provides dot-notation access.
 * The input is deep-cloned to prevent external mutation.
 *
 * @typeParam T - Shape of the underlying data record.
 */
export class ObjectAccessor<
    T extends Record<string, unknown> = Record<string, unknown>,
> extends AbstractAccessor<T> {
    /**
     * Creates an accessor from a plain JavaScript object.
     *
     * @param data - The input object.
     * @returns A new {@link ObjectAccessor} instance.
     * @throws {InvalidFormatError} If `data` is not a non-null object.
     */
    static from(data: unknown): ObjectAccessor {
        if (typeof data !== 'object' || data === null) {
            throw new InvalidFormatError('ObjectAccessor expects an object.');
        }
        return new ObjectAccessor(data);
    }

    /**
     * Deep-clones the raw object to prevent external mutation.
     *
     * @param raw - The input object.
     * @returns A deep-cloned plain record.
     */
    protected parse(raw: unknown): Record<string, unknown> {
        return JSON.parse(JSON.stringify(raw));
    }

    /**
     * Returns a new {@link ObjectAccessor} wrapping the given data.
     *
     * @param data - The record to wrap.
     * @returns A new {@link ObjectAccessor} instance.
     */
    clone(data: Record<string, unknown>): ObjectAccessor<T> {
        return new ObjectAccessor(data) as ObjectAccessor<T>;
    }
}
