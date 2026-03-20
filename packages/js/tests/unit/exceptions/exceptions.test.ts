import { describe, it, expect } from 'vitest';
import { PathNotFoundError } from '../../../src/exceptions/path-not-found.error';
import { AccessorError } from '../../../src/exceptions/accessor.error';
import { SecurityError } from '../../../src/exceptions/security.error';
import { InvalidFormatError } from '../../../src/exceptions/invalid-format.error';
import { ReadonlyViolationError } from '../../../src/exceptions/readonly-violation.error';
import { SchemaValidationError } from '../../../src/exceptions/schema-validation.error';
import { JsonPatchTestFailedError } from '../../../src/exceptions/json-patch-test-failed.error';
import { UnsupportedTypeError } from '../../../src/exceptions/unsupported-type.error';

describe(PathNotFoundError.name, () => {
    it('can be instantiated with a message', () => {
        const error = new PathNotFoundError('path not found');
        expect(error).toBeInstanceOf(PathNotFoundError);
        expect(error).toBeInstanceOf(AccessorError);
        expect(error.message).toBe('path not found');
        expect(error.name).toBe('PathNotFoundError');
    });
});

describe(AccessorError.name, () => {
    it('is an instance of Error and has correct name', () => {
        // Kills StringLiteral mutant: this.name = 'AccessorError' → ''
        const error = new AccessorError('base error');
        expect(error).toBeInstanceOf(Error);
        expect(error.message).toBe('base error');
        expect(error.name).toBe('AccessorError');
    });
});

describe(SecurityError.name, () => {
    it('is instanceof AccessorError, Error, and has correct name', () => {
        // Kills StringLiteral mutant: this.name = 'SecurityError' → ''
        const error = new SecurityError('blocked');
        expect(error).toBeInstanceOf(SecurityError);
        expect(error).toBeInstanceOf(AccessorError);
        expect(error).toBeInstanceOf(Error);
        expect(error.message).toBe('blocked');
        expect(error.name).toBe('SecurityError');
    });
});

describe(InvalidFormatError.name, () => {
    it('is instanceof AccessorError and has correct name', () => {
        // Kills StringLiteral mutant: this.name = 'InvalidFormatError' → ''
        const error = new InvalidFormatError('bad format');
        expect(error).toBeInstanceOf(InvalidFormatError);
        expect(error).toBeInstanceOf(AccessorError);
        expect(error.message).toBe('bad format');
        expect(error.name).toBe('InvalidFormatError');
    });
});

describe(ReadonlyViolationError.name, () => {
    it('uses default message when none supplied', () => {
        // Kills StringLiteral mutant: default message changed
        const error = new ReadonlyViolationError();
        expect(error.message).toBe('Cannot modify a readonly accessor.');
        expect(error.name).toBe('ReadonlyViolationError');
        expect(error).toBeInstanceOf(AccessorError);
    });

    it('uses the supplied message when provided', () => {
        const error = new ReadonlyViolationError('custom msg');
        expect(error.message).toBe('custom msg');
    });
});

describe(SchemaValidationError.name, () => {
    it('formats the message from issues array and exposes issues property', () => {
        // Kills StringLiteral mutant: summary join separator changed
        const issues = [
            { path: 'name', message: 'required' },
            { path: 'age', message: 'must be number' },
        ];
        const error = new SchemaValidationError(issues);
        expect(error).toBeInstanceOf(SchemaValidationError);
        expect(error).toBeInstanceOf(AccessorError);
        expect(error.name).toBe('SchemaValidationError');
        expect(error.message).toBe('Schema validation failed: name: required; age: must be number');
        expect(error.issues).toEqual(issues);
    });

    it('exposes a readonly issues array even for a single issue', () => {
        const issues = [{ path: 'x', message: 'invalid' }];
        const error = new SchemaValidationError(issues);
        expect(error.issues).toHaveLength(1);
        expect(error.issues[0].path).toBe('x');
    });
});

describe(JsonPatchTestFailedError.name, () => {
    it('is instanceof AccessorError and has correct name', () => {
        // Kills StringLiteral mutant: this.name = 'JsonPatchTestFailedError' → ''
        const error = new JsonPatchTestFailedError('test op failed');
        expect(error).toBeInstanceOf(JsonPatchTestFailedError);
        expect(error).toBeInstanceOf(AccessorError);
        expect(error.message).toBe('test op failed');
        expect(error.name).toBe('JsonPatchTestFailedError');
    });
});

describe(UnsupportedTypeError.name, () => {
    it('is instanceof AccessorError and has correct name', () => {
        // Kills StringLiteral mutant: this.name = 'UnsupportedTypeError' → ''
        const error = new UnsupportedTypeError('unknown type');
        expect(error).toBeInstanceOf(UnsupportedTypeError);
        expect(error).toBeInstanceOf(AccessorError);
        expect(error.message).toBe('unknown type');
        expect(error.name).toBe('UnsupportedTypeError');
    });
});
