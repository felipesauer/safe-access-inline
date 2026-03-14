import { AccessorError } from './accessor.error';

export class SecurityError extends AccessorError {
    constructor(message: string) {
        super(message);
        this.name = 'SecurityError';
    }
}
