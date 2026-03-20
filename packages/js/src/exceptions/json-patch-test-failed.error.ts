import { AccessorError } from './accessor.error';

/** Thrown when a JSON Patch `test` operation finds a value mismatch. */
export class JsonPatchTestFailedError extends AccessorError {
    /**
     * @param message - Human-readable error description.
     */
    constructor(message: string) {
        super(message);
        this.name = 'JsonPatchTestFailedError';
    }
}
