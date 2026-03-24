import { AbstractAccessor } from '../core/abstract-accessor';
import { InvalidFormatError } from '../exceptions/invalid-format.error';

/**
 * Accessor for arrays and plain objects.
 *
 * Arrays are converted to index-keyed objects (`{ "0": item0, "1": item1, … }`).
 * Provides dot-notation access via {@link AbstractAccessor}.
 *
 * @typeParam T - Shape of the underlying data record.
 */
export class ArrayAccessor<
    T extends Record<string, unknown> = Record<string, unknown>,
> extends AbstractAccessor<T> {
    /**
     * Creates an accessor from an array or plain object.
     *
     * @param data - The input array or object.
     * @returns A new {@link ArrayAccessor} instance.
     * @throws {InvalidFormatError} If `data` is not an array or object.
     */
    static from(data: unknown, options?: { readonly?: boolean }): ArrayAccessor {
        if (!Array.isArray(data) && (typeof data !== 'object' || data === null)) {
            throw new InvalidFormatError('ArrayAccessor expects an array or object.');
        }
        return new ArrayAccessor(data, options);
    }

    /**
     * Parses an array into an index-keyed record, or returns a plain object as-is.
     *
     * @param raw - The raw array or object input.
     * @returns A plain record keyed by string indices.
     */
    protected parse(raw: unknown): Record<string, unknown> {
        if (Array.isArray(raw)) {
            return Object.fromEntries(raw.map((item, index) => [String(index), item]));
        }
        return raw as Record<string, unknown>;
    }

    /**
     * Returns a new {@link ArrayAccessor} wrapping the given data.
     *
     * @param data - The record to wrap.
     * @returns A new {@link ArrayAccessor} instance.
     */
    protected override clone(data: Record<string, unknown> = {}): ArrayAccessor<T> {
        return new ArrayAccessor(data) as ArrayAccessor<T>;
    }
}
