import type {
    SchemaAdapterInterface,
    SchemaValidationResult,
    SchemaValidationIssue,
} from '../contracts/schema-adapter.interface';

/**
 * Schema adapter for Valibot (https://valibot.dev/).
 * Requires `valibot` as a peer dependency.
 *
 * @example
 * import * as v from 'valibot';
 * import { ValibotSchemaAdapter } from '@safe-access-inline/safe-access-inline';
 *
 * const schema = v.object({ name: v.string(), age: v.number() });
 * accessor.validate(schema, new ValibotSchemaAdapter());
 */
export class ValibotSchemaAdapter implements SchemaAdapterInterface<ValibotSchema> {
    private readonly safeParse: ValibotSafeParseFn;

    /**
     * @param safeParseFn - The `safeParse` function from valibot. Pass `v.safeParse` from your valibot import.
     */
    constructor(safeParseFn: ValibotSafeParseFn) {
        this.safeParse = safeParseFn;
    }

    validate(data: unknown, schema: ValibotSchema): SchemaValidationResult {
        const result = this.safeParse(schema, data);

        if (result.success) {
            return { valid: true, errors: [] };
        }

        const errors: SchemaValidationIssue[] = (result.issues ?? []).map(
            (issue: ValibotIssue) => ({
                path: issue.path?.map((p: ValibotPathItem) => p.key).join('.') || '$',
                message: issue.message,
            }),
        );

        return { valid: false, errors };
    }
}

// Minimal Valibot type definitions
type ValibotSchema = Record<string, unknown>;

interface ValibotPathItem {
    key: string | number;
}

interface ValibotIssue {
    path?: ValibotPathItem[];
    message: string;
}

interface ValibotSafeParseResult {
    success: boolean;
    issues?: ValibotIssue[];
}

type ValibotSafeParseFn = (schema: ValibotSchema, data: unknown) => ValibotSafeParseResult;
