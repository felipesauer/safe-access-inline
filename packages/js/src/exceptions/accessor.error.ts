/** Base error for all safe-access-inline accessor operations. */
export class AccessorError extends Error {
    /**
     * @param message - Error description.
     */
    constructor(message: string) {
        super(message);
        this.name = 'AccessorError';
    }
}
