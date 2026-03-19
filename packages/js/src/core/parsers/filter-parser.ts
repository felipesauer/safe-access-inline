import { SecurityGuard } from '../../security/guards/security-guard';
import {
    type FilterParserConfig,
    DEFAULT_FILTER_PARSER_CONFIG,
} from '../config/filter-parser-config';
import type {
    FilterCondition,
    FilterExpression,
} from '../../contracts/filter-expression.interface';

export type {
    FilterCondition,
    FilterExpression,
} from '../../contracts/filter-expression.interface';

/**
 * Parses and evaluates filter expressions for JSONPath-like queries.
 *
 * Supported syntax:
 *   `[?field>value]` — comparison,
 *   `[?age>=18 && active==true]` — logical AND,
 *   `[?length(@.name)>3]` — function call.
 *
 * Operators: `==`, `!=`, `>`, `<`, `>=`, `<=`.
 * Logical: `&&`, `||`.
 * Functions: `length`, `match`, `keys`.
 */
export class FilterParser {
    private static config: FilterParserConfig = DEFAULT_FILTER_PARSER_CONFIG;

    /**
     * Overrides the default filter parser configuration.
     *
     * @param config - Partial config; unspecified keys retain their defaults.
     */
    static configure(config: Partial<FilterParserConfig>): void {
        FilterParser.config = { ...DEFAULT_FILTER_PARSER_CONFIG, ...config };
    }

    /**
     * Resets the configuration to defaults.
     */
    static resetConfig(): void {
        FilterParser.config = DEFAULT_FILTER_PARSER_CONFIG;
    }

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

        // Detect function call with operator: funcName(...) operator value
        const funcWithOpMatch = token.match(/^(\w+)\(([^)]*)\)\s*(>=|<=|!=|==|>|<)\s*(.+)$/);
        if (funcWithOpMatch) {
            const func = funcWithOpMatch[1];
            const argsRaw = funcWithOpMatch[2];
            const operator = funcWithOpMatch[3] as FilterCondition['operator'];
            const rawValue = funcWithOpMatch[4].trim();
            const funcArgs = argsRaw.split(',').map((a) => a.trim());
            return {
                field: funcArgs[0] || '@',
                operator,
                value: FilterParser.parseValue(rawValue),
                func,
                funcArgs,
            };
        }

        // Detect function call without operator (boolean return): funcName(...)
        const funcBoolMatch = token.match(/^(\w+)\(([^)]*)\)$/);
        if (funcBoolMatch) {
            const func = funcBoolMatch[1];
            const argsRaw = funcBoolMatch[2];
            const funcArgs = argsRaw.split(',').map((a) => a.trim());
            return { field: funcArgs[0] || '@', operator: '==', value: true, func, funcArgs };
        }

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
        let fieldValue: unknown;

        if (condition.func) {
            fieldValue = FilterParser.evaluateFunction(item, condition.func, condition.funcArgs!);
        } else {
            fieldValue = FilterParser.resolveField(item, condition.field);
        }

        const expected = condition.value;

        switch (condition.operator) {
            case '==':
                return fieldValue === expected;
            case '!=':
                return fieldValue !== expected;
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

    private static evaluateFunction(
        item: Record<string, unknown>,
        func: string,
        funcArgs: string[],
    ): unknown {
        switch (func) {
            case 'length': {
                const val = FilterParser.resolveFilterArg(item, funcArgs[0]);
                if (typeof val === 'string') return val.length;
                if (Array.isArray(val)) return val.length;
                if (typeof val === 'object' && val !== null) return Object.keys(val).length;
                return 0;
            }
            case 'match': {
                const val = FilterParser.resolveFilterArg(item, funcArgs[0]);
                if (typeof val !== 'string') return false;
                let pattern = funcArgs[1]?.trim() ?? '';
                // Strip quotes from pattern
                if (
                    (pattern.startsWith("'") && pattern.endsWith("'")) ||
                    (pattern.startsWith('"') && pattern.endsWith('"'))
                ) {
                    pattern = pattern.slice(1, -1);
                }
                // ReDoS guard: reject patterns with nested quantifiers, alternation quantifiers,
                // or excessive length. Covers: (x+)+ / (x+)* / (a|b)+ / (?...*) shapes.
                if (
                    pattern.length > FilterParser.config.maxPatternLength ||
                    /(\+|\*|\{[\d,]+\})\)(\+|\*|\{[\d,]+\})/.test(pattern) || // (group)+ or (group)*
                    /\([^)]*\|[^)]*\)(\+|\*|\{[\d,]+\})/.test(pattern) || // (a|b)+  alternation
                    /\(\?[^)]*[+*]/.test(pattern) // (?...*)  non-capturing quantifier
                ) {
                    return false;
                }
                try {
                    return new RegExp(pattern, 'u').test(val);
                } catch {
                    return false;
                }
            }
            case 'keys': {
                const val = FilterParser.resolveFilterArg(item, funcArgs[0]);
                if (typeof val === 'object' && val !== null && !Array.isArray(val)) {
                    return Object.keys(val).length;
                }
                return 0;
            }
            default:
                throw new Error(`Unknown filter function: "${func}"`);
        }
    }

    private static resolveFilterArg(item: Record<string, unknown>, arg: string): unknown {
        if (!arg || arg === '@') return item;
        // @.field.sub → resolve from item
        if (arg.startsWith('@.')) {
            return FilterParser.resolveField(item, arg.substring(2));
        }
        return FilterParser.resolveField(item, arg);
    }

    private static resolveField(item: Record<string, unknown>, field: string): unknown {
        if (field.includes('.')) {
            let current: unknown = item;
            for (const key of field.split('.')) {
                SecurityGuard.assertSafeKey(key); // prevent prototype chain traversal
                if (
                    current !== null &&
                    typeof current === 'object' &&
                    Object.prototype.hasOwnProperty.call(current, key)
                ) {
                    current = (current as Record<string, unknown>)[key];
                } else {
                    return undefined;
                }
            }
            return current;
        }
        SecurityGuard.assertSafeKey(field); // prevent prototype chain traversal
        return Object.prototype.hasOwnProperty.call(item, field) ? item[field] : undefined;
    }
}
