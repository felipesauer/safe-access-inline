import { AbstractAccessor } from '../core/abstract-accessor';
import { InvalidFormatError } from '../exceptions/invalid-format.error';

export class JsonAccessor extends AbstractAccessor {
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

  clone(data: Record<string, unknown>): JsonAccessor {
    return new JsonAccessor(JSON.stringify(data));
  }
}
