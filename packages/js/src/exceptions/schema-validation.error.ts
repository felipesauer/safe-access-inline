import { AccessorError } from './accessor.error';
import type { SchemaValidationIssue } from '../contracts/schema-adapter.interface';

/** Thrown when schema validation fails, carrying the list of validation issues. */
export class SchemaValidationError extends AccessorError {
    readonly issues: SchemaValidationIssue[];

    constructor(issues: SchemaValidationIssue[]) {
        const summary = issues.map((e) => `${e.path}: ${e.message}`).join('; ');
        super(`Schema validation failed: ${summary}`);
        this.name = 'SchemaValidationError';
        this.issues = issues;
    }
}
