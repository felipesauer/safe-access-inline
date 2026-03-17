import type {
    SchemaAdapterInterface,
    SchemaValidationResult,
    SchemaValidationIssue,
} from '../contracts/schema-adapter.interface';

type JsonSchema = Record<string, unknown>;

/**
 * Schema adapter for JSON Schema (draft-07 subset).
 * Supports: type, required, properties, items, minimum, maximum,
 * minLength, maxLength, enum.
 *
 * @example
 * import { JsonSchemaAdapter } from '@safe-access-inline/safe-access-inline';
 *
 * const schema = { type: 'object', required: ['name'], properties: { name: { type: 'string' } } };
 * const adapter = new JsonSchemaAdapter();
 * const result = adapter.validate({ name: 'Ana' }, schema);
 */
export class JsonSchemaAdapter implements SchemaAdapterInterface<JsonSchema> {
    validate(data: unknown, schema: JsonSchema): SchemaValidationResult {
        const errors = this.validateNode(data, schema, '$');
        return { valid: errors.length === 0, errors };
    }

    private validateNode(data: unknown, schema: JsonSchema, path: string): SchemaValidationIssue[] {
        const errors: SchemaValidationIssue[] = [];

        if (schema.type !== undefined) {
            const expectedType = schema.type as string | string[];
            const actualType = Array.isArray(data) ? 'array' : data === null ? 'null' : typeof data;
            const typeList = Array.isArray(expectedType) ? expectedType : [expectedType];
            if (!typeList.includes(actualType)) {
                errors.push({
                    path,
                    message: `expected type '${typeList.join('|')}' but got '${actualType}'`,
                });
                return errors;
            }
        }

        if (
            schema.required !== undefined &&
            typeof data === 'object' &&
            data !== null &&
            !Array.isArray(data)
        ) {
            const obj = data as Record<string, unknown>;
            for (const key of schema.required as string[]) {
                if (!(key in obj)) {
                    errors.push({ path: `${path}.${key}`, message: 'required field missing' });
                }
            }
        }

        if (
            schema.properties !== undefined &&
            typeof data === 'object' &&
            data !== null &&
            !Array.isArray(data)
        ) {
            const obj = data as Record<string, unknown>;
            const props = schema.properties as Record<string, JsonSchema>;
            for (const [key, subSchema] of Object.entries(props)) {
                if (key in obj) {
                    errors.push(...this.validateNode(obj[key], subSchema, `${path}.${key}`));
                }
            }
        }

        if (schema.items !== undefined && Array.isArray(data)) {
            const itemSchema = schema.items as JsonSchema;
            data.forEach((item, i) => {
                errors.push(...this.validateNode(item, itemSchema, `${path}[${i}]`));
            });
        }

        if (schema.minimum !== undefined && typeof data === 'number') {
            if (data < (schema.minimum as number)) {
                errors.push({
                    path,
                    message: `value ${data} is less than minimum ${schema.minimum}`,
                });
            }
        }

        if (schema.maximum !== undefined && typeof data === 'number') {
            if (data > (schema.maximum as number)) {
                errors.push({ path, message: `value ${data} exceeds maximum ${schema.maximum}` });
            }
        }

        if (schema.minLength !== undefined && typeof data === 'string') {
            if (data.length < (schema.minLength as number)) {
                errors.push({
                    path,
                    message: `string length ${data.length} is less than minLength ${schema.minLength}`,
                });
            }
        }

        if (schema.maxLength !== undefined && typeof data === 'string') {
            if (data.length > (schema.maxLength as number)) {
                errors.push({
                    path,
                    message: `string length ${data.length} exceeds maxLength ${schema.maxLength}`,
                });
            }
        }

        if (schema.enum !== undefined) {
            const enumVals = schema.enum as unknown[];
            if (!enumVals.some((v) => JSON.stringify(v) === JSON.stringify(data))) {
                errors.push({
                    path,
                    message: `value must be one of: ${enumVals.map((v) => JSON.stringify(v)).join(', ')}`,
                });
            }
        }

        return errors;
    }
}
