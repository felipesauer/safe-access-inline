import { AccessorError } from './accessor.error';

export class ReadonlyViolationError extends AccessorError {
    constructor(message = 'Cannot modify a readonly accessor.') {
        super(message);
        this.name = 'ReadonlyViolationError';
    }
}
