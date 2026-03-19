/**
 * A single condition within a filter expression.
 *
 * Represents a comparison like `field > value` or a function call
 * like `length(@.name) > 3`.
 */
export interface FilterCondition {
    /** The field path to evaluate (e.g. `"age"`, `"profile.name"`). */
    field: string;
    /** The comparison operator. */
    operator: '==' | '!=' | '>' | '<' | '>=' | '<=';
    /** The value to compare against. */
    value: unknown;
    /** Optional function name (e.g. `"length"`, `"match"`, `"keys"`). */
    func?: string;
    /** Optional function arguments. */
    funcArgs?: string[];
}

/**
 * A parsed filter expression consisting of one or more {@link FilterCondition}s
 * joined by logical operators (`&&` or `||`).
 *
 * @example
 * The expression `[?age>=18 && active==true]` parses to:
 * ```ts
 * {
 *   conditions: [
 *     { field: 'age', operator: '>=', value: 18 },
 *     { field: 'active', operator: '==', value: true },
 *   ],
 *   logicals: ['&&'],
 * }
 * ```
 */
export interface FilterExpression {
    /** Ordered list of comparison conditions. */
    conditions: FilterCondition[];
    /** Logical operators connecting adjacent conditions (length = conditions.length - 1). */
    logicals: ('&&' | '||')[];
}
