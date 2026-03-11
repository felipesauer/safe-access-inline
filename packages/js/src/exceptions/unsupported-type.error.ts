import { AccessorError } from './accessor.error';

export class UnsupportedTypeError extends AccessorError {
  constructor(message: string) {
    super(message);
    this.name = 'UnsupportedTypeError';
  }
}
