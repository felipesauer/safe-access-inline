import { AccessorError } from './accessor.error';

/** Thrown when a dot-notation path cannot be resolved in the data. */
export class PathNotFoundError extends AccessorError {
    /**
     * @param message - Human-readable error description.
     */
    constructor(message: string) {
        super(message);
        this.name = 'PathNotFoundError';
    }
}
