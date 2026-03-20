import type {
    SchemaAdapterInterface,
    SchemaValidationResult,
    SchemaValidationIssue,
} from '../contracts/schema-adapter.interface';

/**
 * Schema adapter for Yup (https://github.com/jquense/yup).
 * Requires `yup` as a peer dependency.
 *
 * @example
 * import * as yup from 'yup';
 * import { YupSchemaAdapter } from '@safe-access-inline/safe-access-inline';
 *
 * const schema = yup.object({ name: yup.string().required(), age: yup.number().required() });
 * accessor.validate(schema, new YupSchemaAdapter());
 */
export class YupSchemaAdapter implements SchemaAdapterInterface<YupSchema> {
    /**
     * Validates `data` against the given Yup schema.
     *
     * @param data - The value to validate.
     * @param schema - The Yup schema to validate against.
     * @returns A {@link SchemaValidationResult} with `valid` flag and any errors.
     * @throws Re-throws non-Yup errors encountered during validation.
     */
    validate(data: unknown, schema: YupSchema): SchemaValidationResult {
        try {
            schema.validateSync(data, { abortEarly: false });
            return { valid: true, errors: [] };
        } catch (err: unknown) {
            if (isYupValidationError(err)) {
                const errors: SchemaValidationIssue[] = (err.inner ?? []).map(
                    (issue: YupInnerError) => ({
                        path: issue.path || '$',
                        message: issue.message,
                    }),
                );
                // If no inner errors, use the top-level error
                if (errors.length === 0) {
                    return {
                        valid: false,
                        errors: [{ path: err.path || '$', message: err.message }],
                    };
                }
                return { valid: false, errors };
            }
            throw err;
        }
    }
}

// Minimal Yup type definitions
interface YupSchema {
    validateSync(data: unknown, options?: { abortEarly?: boolean }): unknown;
}

interface YupInnerError {
    path?: string;
    message: string;
}

interface YupValidationError {
    name: string;
    path?: string;
    message: string;
    inner?: YupInnerError[];
}

/**
 * Type guard that checks whether an unknown error is a Yup `ValidationError`.
 *
 * @param err - The value to test.
 * @returns `true` if `err` is a Yup `ValidationError`.
 */
function isYupValidationError(err: unknown): err is YupValidationError {
    return (
        typeof err === 'object' &&
        err !== null &&
        'name' in err &&
        (err as Record<string, unknown>).name === 'ValidationError'
    );
}
