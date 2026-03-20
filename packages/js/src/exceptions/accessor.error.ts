/** Base error for all safe-access-inline accessor operations. */
export class AccessorError extends Error {
    /**
     * @param message - Human-readable error description.
     */
    constructor(message: string) {
        super(message);
        this.name = 'AccessorError';
    }
}
