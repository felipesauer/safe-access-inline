import { AbstractAccessor } from '../core/abstract-accessor';
import { InvalidFormatError } from '../exceptions/invalid-format.error';

export class ArrayAccessor<
    T extends Record<string, unknown> = Record<string, unknown>,
> extends AbstractAccessor<T> {
    static from(data: unknown): ArrayAccessor {
        if (!Array.isArray(data) && (typeof data !== 'object' || data === null)) {
            throw new InvalidFormatError('ArrayAccessor expects an array or object.');
        }
        return new ArrayAccessor(data);
    }

    protected parse(raw: unknown): Record<string, unknown> {
        if (Array.isArray(raw)) {
            return Object.fromEntries(raw.map((item, index) => [String(index), item]));
        }
        return raw as Record<string, unknown>;
    }

    clone(data: Record<string, unknown>): ArrayAccessor<T> {
        return new ArrayAccessor(data) as ArrayAccessor<T>;
    }
}
