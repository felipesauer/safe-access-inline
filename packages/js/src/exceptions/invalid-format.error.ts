import { AccessorError } from './accessor.error';

export class InvalidFormatError extends AccessorError {
  constructor(message: string) {
    super(message);
    this.name = 'InvalidFormatError';
  }
}
