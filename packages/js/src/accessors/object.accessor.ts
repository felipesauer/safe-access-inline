import { AbstractAccessor } from '../core/abstract-accessor';
import { InvalidFormatError } from '../exceptions/invalid-format.error';

export class ObjectAccessor extends AbstractAccessor {
  static from(data: unknown): ObjectAccessor {
    if (typeof data !== 'object' || data === null) {
      throw new InvalidFormatError('ObjectAccessor expects an object.');
    }
    return new ObjectAccessor(data);
  }

  protected parse(raw: unknown): Record<string, unknown> {
    return JSON.parse(JSON.stringify(raw));
  }

  clone(data: Record<string, unknown>): ObjectAccessor {
    return new ObjectAccessor(data);
  }
}
