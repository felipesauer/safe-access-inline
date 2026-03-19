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
    /** Creates an accessor from a JSON string. */
    static from(data: unknown): JsonAccessor {
        if (typeof data !== 'string') {
            throw new InvalidFormatError('JsonAccessor expects a JSON string.');
        }
        return new JsonAccessor(data);
    }

    protected parse(raw: unknown): Record<string, unknown> {
        try {
            const parsed = JSON.parse(raw as string);
            return typeof parsed === 'object' && parsed !== null ? parsed : {};
        } catch {
            throw new InvalidFormatError('JsonAccessor failed to parse JSON string.');
        }
    }

    clone(data: Record<string, unknown>): JsonAccessor<T> {
        return new JsonAccessor(JSON.stringify(data)) as JsonAccessor<T>;
    }
}
