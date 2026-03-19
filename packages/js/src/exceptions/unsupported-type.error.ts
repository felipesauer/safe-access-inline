import { AccessorError } from './accessor.error';

/** Thrown when {@link TypeDetector} cannot determine the format of the input data. */
export class UnsupportedTypeError extends AccessorError {
    constructor(message: string) {
        super(message);
        this.name = 'UnsupportedTypeError';
    }
}
