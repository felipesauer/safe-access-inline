import { describe, it, expect } from 'vitest';
import { PathNotFoundError } from '../../../src/exceptions/path-not-found.error';
import { AccessorError } from '../../../src/exceptions/accessor.error';

describe(PathNotFoundError.name, () => {
    it('can be instantiated with a message', () => {
        const error = new PathNotFoundError('path not found');
        expect(error).toBeInstanceOf(PathNotFoundError);
        expect(error).toBeInstanceOf(AccessorError);
        expect(error.message).toBe('path not found');
        expect(error.name).toBe('PathNotFoundError');
    });
});
