import { AccessorError } from './accessor.error';

/** Thrown when a security policy is violated (SSRF, payload size, key traversal, etc.). */
export class SecurityError extends AccessorError {
    constructor(message: string) {
        super(message);
        this.name = 'SecurityError';
    }
}
