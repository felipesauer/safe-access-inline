import { AccessorError } from './accessor.error';

/** Thrown when input data cannot be parsed in the expected format. */
export class InvalidFormatError extends AccessorError {
    constructor(message: string) {
        super(message);
        this.name = 'InvalidFormatError';
    }
}
