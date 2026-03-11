import { AccessorError } from './accessor.error';

export class PathNotFoundError extends AccessorError {
  constructor(message: string) {
    super(message);
    this.name = 'PathNotFoundError';
  }
}
