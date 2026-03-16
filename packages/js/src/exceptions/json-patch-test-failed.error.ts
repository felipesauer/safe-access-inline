import { AccessorError } from './accessor.error';

export class JsonPatchTestFailedError extends AccessorError {
    constructor(message: string) {
        super(message);
        this.name = 'JsonPatchTestFailedError';
    }
}
