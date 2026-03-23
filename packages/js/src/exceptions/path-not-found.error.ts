import { AccessorError } from './accessor.error';

/**
 * Thrown when a dot-notation path cannot be resolved in the data.
 *
 * @remarks
 * Most read methods (e.g. `get()`, `getString()`) return a caller-supplied default
 * value instead of throwing. This error is only raised by strict-mode operations
 * such as `getStrict()` or `getRequired()` where an absent path is unacceptable.
 */
export class PathNotFoundError extends AccessorError {
    /**
     * @param message - Human-readable error description.
     */
    constructor(message: string) {
        super(message);
        this.name = 'PathNotFoundError';
    }
}
