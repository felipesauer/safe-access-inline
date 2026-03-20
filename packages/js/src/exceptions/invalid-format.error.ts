import { AccessorError } from './accessor.error';

/** Thrown when input data cannot be parsed in the expected format. */
export class InvalidFormatError extends AccessorError {
    /**
     * @param message - Human-readable error description.
     */
    constructor(message: string) {
        super(message);
        this.name = 'InvalidFormatError';
    }
}
