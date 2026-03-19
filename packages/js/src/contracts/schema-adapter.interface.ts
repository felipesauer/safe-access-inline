/**
 * Outcome of a schema validation run.
 *
 * When `valid` is `true`, `errors` is an empty array.
 * When `valid` is `false`, `errors` contains one or more {@link SchemaValidationIssue} entries.
 */
export interface SchemaValidationResult {
    /** Whether the data conforms to the schema. */
    valid: boolean;
    /** List of validation issues (empty when valid). */
    errors: SchemaValidationIssue[];
}

/**
 * A single validation issue reported by a schema adapter.
 */
export interface SchemaValidationIssue {
    /** Dot-notation or JSON Pointer path to the offending value. */
    path: string;
    /** Human-readable description of the validation failure. */
    message: string;
}

/**
 * Adapter interface for pluggable schema validation libraries.
 *
 * Implement this for Zod, Valibot, Yup, AJV, JSON Schema, or any other
 * schema library. The generic `TSchema` parameter represents the schema type
 * accepted by the underlying library.
 *
 * @typeParam TSchema - The schema type (e.g. `z.ZodType`, `JSONSchema`).
 */
export interface SchemaAdapterInterface<TSchema = unknown> {
    /**
     * Validates data against a schema.
     *
     * @param data - The data to validate.
     * @param schema - The schema to validate against.
     * @returns Validation result with errors (if any).
     */
    validate(data: unknown, schema: TSchema): SchemaValidationResult;
}
