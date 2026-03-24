import { AccessorError } from './accessor.error';

/** Thrown when a security policy is violated (SSRF, payload size, key traversal, etc.). */
export class SecurityError extends AccessorError {
    /**
     * @param message - Error description.
     */
    constructor(message: string) {
        super(message);
        this.name = 'SecurityError';
    }
}
