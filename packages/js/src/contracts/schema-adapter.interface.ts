/**
 * Result of a schema validation.
 */
export interface SchemaValidationResult {
    valid: boolean;
    errors: SchemaValidationIssue[];
}

export interface SchemaValidationIssue {
    path: string;
    message: string;
}

/**
 * Adapter interface for pluggable schema validation libraries.
 * Implement this for Zod, Valibot, Yup, AJV, or any other schema lib.
 */
export interface SchemaAdapterInterface<TSchema = unknown> {
    validate(data: unknown, schema: TSchema): SchemaValidationResult;
}
