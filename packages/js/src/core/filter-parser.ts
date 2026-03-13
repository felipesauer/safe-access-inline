/**
 * Parses and evaluates filter expressions for JSONPath-like queries.
 *
 * Supported syntax:
 *   [?field>value]             — comparison
 *   [?field=='string']         — equality with string
 *   [?age>=18 && active==true] — logical AND
 *   [?env=='prod' || env=='staging'] — logical OR
 *
 * Operators: ==, !=, >, <, >=, <=
 * Logical:   &&, ||
 * Values:    number, 'string', "string", true, false, null
 */

export interface FilterCondition {
    field: string;
    operator: '==' | '!=' | '>' | '<' | '>=' | '<=';
    value: unknown;
}

export interface FilterExpression {
    conditions: FilterCondition[];
    logicals: ('&&' | '||')[];
}

export class FilterParser {
    /**
     * Parses "[?expr]" content (without the [? and ] delimiters).
     */
    static parse(expression: string): FilterExpression {
        const conditions: FilterCondition[] = [];
        const logicals: ('&&' | '||')[] = [];

        const parts = FilterParser.splitLogical(expression);

        for (let i = 0; i < parts.tokens.length; i++) {
            conditions.push(FilterParser.parseCondition(parts.tokens[i].trim()));
        }

        logicals.push(...parts.operators);

        return { conditions, logicals };
    }

    /**
     * Evaluates a filter expression against a single item.
     */
    static evaluate(item: Record<string, unknown>, expr: FilterExpression): boolean {
        if (expr.conditions.length === 0) return false;

        let result = FilterParser.evaluateCondition(item, expr.conditions[0]);

        for (let i = 0; i < expr.logicals.length; i++) {
            const nextResult = FilterParser.evaluateCondition(item, expr.conditions[i + 1]);
            if (expr.logicals[i] === '&&') {
                result = result && nextResult;
            } else {
                result = result || nextResult;
            }
        }

        return result;
    }

    private static splitLogical(expression: string): {
        tokens: string[];
        operators: ('&&' | '||')[];
    } {
        const tokens: string[] = [];
        const operators: ('&&' | '||')[] = [];
        let current = '';
        let inString = false;
        let stringChar = '';

        for (let i = 0; i < expression.length; i++) {
            const ch = expression[i];

            if (inString) {
                current += ch;
                if (ch === stringChar) inString = false;
                continue;
            }

            if (ch === "'" || ch === '"') {
                inString = true;
                stringChar = ch;
                current += ch;
                continue;
            }

            if (ch === '&' && expression[i + 1] === '&') {
                tokens.push(current);
                operators.push('&&');
                current = '';
                i++;
                continue;
            }

            if (ch === '|' && expression[i + 1] === '|') {
                tokens.push(current);
                operators.push('||');
                current = '';
                i++;
                continue;
            }

            current += ch;
        }

        tokens.push(current);
        return { tokens, operators };
    }

    private static parseCondition(token: string): FilterCondition {
        const operators = ['>=', '<=', '!=', '==', '>', '<'] as const;

        for (const op of operators) {
            const idx = token.indexOf(op);
            if (idx !== -1) {
                const field = token.substring(0, idx).trim();
                const rawValue = token.substring(idx + op.length).trim();
                return { field, operator: op, value: FilterParser.parseValue(rawValue) };
            }
        }

        throw new Error(`Invalid filter condition: "${token}"`);
    }

    static parseValue(raw: string): unknown {
        if (raw === 'true') return true;
        if (raw === 'false') return false;
        if (raw === 'null') return null;

        if (
            (raw.startsWith("'") && raw.endsWith("'")) ||
            (raw.startsWith('"') && raw.endsWith('"'))
        ) {
            return raw.slice(1, -1);
        }

        const num = Number(raw);
        if (!isNaN(num) && raw !== '') return num;

        return raw;
    }

    private static evaluateCondition(
        item: Record<string, unknown>,
        condition: FilterCondition,
    ): boolean {
        const fieldValue = FilterParser.resolveField(item, condition.field);
        const expected = condition.value;

        switch (condition.operator) {
            case '==':
                return fieldValue == expected;
            case '!=':
                return fieldValue != expected;
            case '>':
                return (fieldValue as number) > (expected as number);
            case '<':
                return (fieldValue as number) < (expected as number);
            case '>=':
                return (fieldValue as number) >= (expected as number);
            case '<=':
                return (fieldValue as number) <= (expected as number);
        }
    }

    private static resolveField(item: Record<string, unknown>, field: string): unknown {
        if (field.includes('.')) {
            let current: unknown = item;
            for (const key of field.split('.')) {
                if (
                    current !== null &&
                    typeof current === 'object' &&
                    key in (current as Record<string, unknown>)
                ) {
                    current = (current as Record<string, unknown>)[key];
                } else {
                    return undefined;
                }
            }
            return current;
        }
        return item[field];
    }
}
