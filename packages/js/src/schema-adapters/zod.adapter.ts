import type {
    SchemaAdapterInterface,
    SchemaValidationResult,
    SchemaValidationIssue,
} from '../contracts/schema-adapter.interface';

/**
 * Schema adapter for Zod (https://zod.dev/).
 * Requires `zod` as a peer dependency.
 *
 * @example
 * import { z } from 'zod';
 * import { ZodSchemaAdapter } from '@safe-access-inline/safe-access-inline';
 *
 * const schema = z.object({ name: z.string(), age: z.number() });
 * accessor.validate(schema, new ZodSchemaAdapter());
 */
export class ZodSchemaAdapter<
    TSchema extends { safeParse: (data: unknown) => ZodSafeParseResult },
> implements SchemaAdapterInterface<TSchema> {
    validate(data: unknown, schema: TSchema): SchemaValidationResult {
        const result = schema.safeParse(data);

        if (result.success) {
            return { valid: true, errors: [] };
        }

        const errors: SchemaValidationIssue[] = (result.error?.issues ?? []).map(
            (issue: ZodIssue) => ({
                path: issue.path.join('.') || '$',
                message: issue.message,
            }),
        );

        return { valid: false, errors };
    }
}

// Minimal Zod type definitions to avoid requiring the full dependency
interface ZodIssue {
    path: (string | number)[];
    message: string;
}

interface ZodSafeParseResult {
    success: boolean;
    error?: { issues: ZodIssue[] };
}
