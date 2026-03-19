import { AccessorError } from './accessor.error';

/** Thrown when a mutating operation is attempted on a frozen (readonly) accessor. */
export class ReadonlyViolationError extends AccessorError {
    constructor(message = 'Cannot modify a readonly accessor.') {
        super(message);
        this.name = 'ReadonlyViolationError';
    }
}
