<?php

declare(strict_types=1);

namespace SafeAccessInline\Core\Parsers;

use SafeAccessInline\Core\Config\FilterParserConfig;
use SafeAccessInline\Enums\AuditEventType;
use SafeAccessInline\Security\Audit\AuditLogger;
use SafeAccessInline\Security\Guards\SecurityGuard;

/**
 * Parses and evaluates filter expressions for JSONPath-like queries.
 *
 * Supported syntax:
 *   [?field>value]             — comparison
 *   [?field=='string']         — equality with string
 *   [?age>=18 && active==true] — logical AND
 *   [?env=='prod' || env=='staging'] — logical OR
 *   [?length(@.name)>3]       — function: length
 *   [?match(@.name,'Ana.*')]  — function: match
 *   [?keys(@)>2]              — function: keys (count of keys)
 *   [?starts_with(@.name,'Ana')] — function: string prefix match
 *   [?contains(@.tags,'admin')] — function: substring or array membership
 *   [?values(@)>3]            — function: value count
 *   [?price * qty > 100]      — arithmetic expression
 *
 * Operators: ==, !=, >, <, >=, <=
 * Logical:   &&, ||
 * Values:    number, 'string', "string", true, false, null
 * Functions: length(@.field), match(@.field, 'pattern'), keys(@),
 *            starts_with(@.field, 'prefix'), contains(@.field, 'needle'), values(@)
 */
final class FilterParser
{
    /** Active filter parser configuration, lazily initialised on first access. */
    private static FilterParserConfig $config;

    /**
     * Returns the active filter parser configuration, lazily initialised.
     */
    private static function config(): FilterParserConfig
    {
        return self::$config ??= new FilterParserConfig();
    }

    /**
     * Overrides the default filter parser configuration.
     */
    public static function configure(FilterParserConfig $config): void
    {
        self::$config = $config;
    }

    /**
     * Resets the configuration to defaults.
     */
    public static function resetConfig(): void
    {
        self::$config = new FilterParserConfig();
    }

    /**
     * Parses a filter expression (without enclosing [? and ]).
     *
     * @param string $expression
     * @return array{conditions: array<array{field: string, operator: string, value: mixed}>, logicals: array<string>}
     */
    public static function parse(string $expression): array
    {
        $conditions = [];
        $logicals = [];

        $parts = self::splitLogical($expression);

        foreach ($parts['tokens'] as $token) {
            try {
                $conditions[] = self::parseCondition(trim($token));
            } catch (\RuntimeException $e) {
                // Exotic tokens (backticks, semicolons, unrecognised operators) cannot be
                // parsed into a valid condition. Return empty conditions so the caller treats
                // this filter as "no match" — consistent with "path not found" semantics.
                AuditLogger::emit(AuditEventType::DATA_FORMAT_WARNING->value, [
                    'reason'     => 'invalid_filter_condition',
                    'expression' => $expression,
                    'token'      => $token,
                    'error'      => $e->getMessage(),
                ]);

                return ['conditions' => [], 'logicals' => []];
            }
        }

        $logicals = $parts['operators'];

        return ['conditions' => $conditions, 'logicals' => $logicals];
    }

    /**
     * Evaluates a filter expression against a single item.
     *
     * @param array<mixed> $item
     * @param array{conditions: array<array{field: string, operator: string, value: mixed}>, logicals: array<string>} $expr
     * @return bool
     */
    public static function evaluate(array $item, array $expr): bool
    {
        if (count($expr['conditions']) === 0) {
            return false;
        }

        $result = self::evaluateCondition($item, $expr['conditions'][0]);

        $logicalCount = count($expr['logicals']);
        for ($i = 0; $i < $logicalCount; $i++) {
            $nextResult = self::evaluateCondition($item, $expr['conditions'][$i + 1]);
            if ($expr['logicals'][$i] === '&&') {
                $result = $result && $nextResult;
            } else {
                $result = $result || $nextResult;
            }
        }

        return $result;
    }

    /**
     * Splits a filter expression string into condition tokens and logical operators.
     *
     * Respects quoted strings so that `&&` or `||` inside quoted values are not treated
     * as logical operators.
     *
     * @param  string $expression Full filter expression, e.g. `age>=18 && active==true`.
     * @return array{tokens: array<string>, operators: array<string>} Condition tokens and logical operators.
     */
    private static function splitLogical(string $expression): array
    {
        $tokens = [];
        $operators = [];
        $current = '';
        $inString = false;
        $stringChar = '';
        $len = strlen($expression);

        for ($i = 0; $i < $len; $i++) {
            $ch = $expression[$i];

            if ($inString) {
                $current .= $ch;
                if ($ch === $stringChar) {
                    $inString = false;
                }
                continue;
            }

            if ($ch === "'" || $ch === '"') {
                $inString = true;
                $stringChar = $ch;
                $current .= $ch;
                continue;
            }

            if ($ch === '&' && $i + 1 < $len && $expression[$i + 1] === '&') {
                $tokens[] = $current;
                $operators[] = '&&';
                $current = '';
                $i++;
                continue;
            }

            if ($ch === '|' && $i + 1 < $len && $expression[$i + 1] === '|') {
                $tokens[] = $current;
                $operators[] = '||';
                $current = '';
                $i++;
                continue;
            }

            $current .= $ch;
        }

        $tokens[] = $current;
        return ['tokens' => $tokens, 'operators' => $operators];
    }

    /**
     * Parses a single condition token into a structured condition array.
     *
     * Handles plain comparisons (`field op value`), function+operator forms
     * (`length(@.field) > 3`), and boolean function forms (`match(@.name,'Ana.*')`).
     *
     * @param  string $token Single condition token, e.g. `age>=18` or `length(@.name)>3`.
     * @return array{field: string, operator: string, value: mixed, func?: string, funcArgs?: array<string>} Parsed condition.
     */
    private static function parseCondition(string $token): array
    {
        $operators = ['>=', '<=', '!=', '==', '>', '<'];

        // Detect function call with operator: funcName(...) operator value
        if (preg_match('/^(\w+)\(([^)]*)\)\s*(>=|<=|!=|==|>|<)\s*(.+)$/', $token, $funcMatch)) {
            $func = $funcMatch[1];
            $argsRaw = $funcMatch[2];
            $operator = $funcMatch[3];
            $rawValue = trim($funcMatch[4]);
            $funcArgs = array_map('trim', explode(',', $argsRaw));
            return [
                'field' => $funcArgs[0],
                'operator' => $operator,
                'value' => self::parseValue($rawValue),
                'func' => $func,
                'funcArgs' => $funcArgs,
            ];
        }

        // Detect function call without operator (boolean return): funcName(...)
        if (preg_match('/^(\w+)\(([^)]*)\)$/', $token, $funcBoolMatch)) {
            $func = $funcBoolMatch[1];
            $argsRaw = $funcBoolMatch[2];
            $funcArgs = array_map('trim', explode(',', $argsRaw));
            return [
                'field' => $funcArgs[0],
                'operator' => '==',
                'value' => true,
                'func' => $func,
                'funcArgs' => $funcArgs,
            ];
        }

        foreach ($operators as $op) {
            $pos = strpos($token, $op);
            if ($pos !== false) {
                $field = trim(substr($token, 0, $pos));
                $rawValue = trim(substr($token, $pos + strlen($op)));
                return ['field' => $field, 'operator' => $op, 'value' => self::parseValue($rawValue)];
            }
        }

        throw new \RuntimeException("Invalid filter condition: \"{$token}\"");
    }

    /**
     * Parses a raw scalar string from a filter expression into its PHP type.
     *
     * Handles `true`, `false`, `null`, quoted strings, integers, and floats.
     *
     * @param  string $raw Raw value token, e.g. `'Ana'`, `18`, `true`.
     * @return mixed Typed PHP value corresponding to the raw token.
     */
    public static function parseValue(string $raw): mixed
    {
        if ($raw === 'true') {
            return true;
        }
        if ($raw === 'false') {
            return false;
        }
        if ($raw === 'null') {
            return null;
        }

        if (
            (str_starts_with($raw, "'") && str_ends_with($raw, "'"))
            || (str_starts_with($raw, '"') && str_ends_with($raw, '"'))
        ) {
            return substr($raw, 1, -1);
        }

        if (is_numeric($raw)) {
            return str_contains($raw, '.') ? (float) $raw : (int) $raw;
        }

        return $raw;
    }

    /**
     * Evaluates a single condition against one item in the dataset.
     *
     * Resolves the field value (or calls a function), then compares it to the
     * expected value using the condition's operator.
     *
     * @param  array<mixed> $item      Data item to evaluate.
     * @param  array{field: string, operator: string, value: mixed, func?: string, funcArgs?: array<string>} $condition Parsed condition descriptor.
     * @return bool True when the item satisfies the condition.
     */
    private static function evaluateCondition(array $item, array $condition): bool
    {
        if (isset($condition['func'])) {
            $fieldValue = self::evaluateFunction($item, $condition['func'], $condition['funcArgs'] ?? []);
        } elseif (preg_match('/[@\w.]+\s*[+\-*\/]\s*[@\w.]+/', $condition['field']) === 1) {
            // Arithmetic expression in field, e.g. `price * qty`
            $fieldValue = self::resolveArithmetic($item, $condition['field']);
        } else {
            $fieldValue = self::resolveField($item, $condition['field']);
        }

        $expected = $condition['value'];

        return match ($condition['operator']) {
            '==' => $fieldValue === $expected,
            '!=' => $fieldValue !== $expected,
            '>' => $fieldValue > $expected,
            '<' => $fieldValue < $expected,
            '>=' => $fieldValue >= $expected,
            '<=' => $fieldValue <= $expected,
            default => false,
        };
    }

    /**
     * Dispatches a filter function call and returns its computed value.
     *
     * Supports `length`, `match`, and `keys`. Throws for unknown functions.
     *
     * @param  array<mixed>  $item     Data item to operate on.
     * @param  string        $func     Function name, e.g. `'length'`, `'match'`.
     * @param  array<string> $funcArgs Parsed function arguments.
     * @return mixed Computed result of the function call.
     *
     * @throws \RuntimeException When `$func` is not a known filter function.
     */
    private static function evaluateFunction(array $item, string $func, array $funcArgs): mixed
    {
        return match ($func) {
            'length' => self::evalLength($item, $funcArgs),
            'match' => self::evalMatch($item, $funcArgs),
            'keys' => self::evalKeys($item, $funcArgs),
            'starts_with' => self::evalStartsWith($item, $funcArgs),
            'contains' => self::evalContains($item, $funcArgs),
            'values' => self::evalValues($item, $funcArgs),
            default => throw new \RuntimeException("Unknown filter function: \"{$func}\""),
        };
    }

    /**
     * Evaluates the `length()` filter function.
     *
     * Returns the character count for strings and the element count for arrays;
     * returns 0 for any other type.
     *
     * @param  array<mixed>  $item     Data item to operate on.
     * @param  array<string> $funcArgs Parsed function arguments; first arg is the field path.
     * @return int Length of the resolved value.
     */
    private static function evalLength(array $item, array $funcArgs): int
    {
        $val = self::resolveFilterArg($item, $funcArgs[0] ?? '@');
        if (is_string($val)) {
            return strlen($val);
        }
        if (is_array($val)) {
            return count($val);
        }
        return 0;
    }

    /**
     * @param array<mixed> $item
     * @param array<string> $funcArgs
     */
    /**
     * Evaluates the `match()` filter function.
     *
     * Applies the PCRE pattern in `$funcArgs[1]` against the resolved string value.
     * Enforces ReDoS guards from {@see FilterParserConfig} before executing the match.
     *
     * @param  array<mixed>  $item     Data item to operate on.
     * @param  array<string> $funcArgs Arguments: [0] = field path, [1] = regex pattern.
     * @return bool True when the resolved string matches the pattern.
     */
    private static function evalMatch(array $item, array $funcArgs): bool
    {
        $val = self::resolveFilterArg($item, $funcArgs[0] ?? '@');
        if (!is_string($val)) {
            return false;
        }
        $pattern = trim($funcArgs[1] ?? '');
        // Strip quotes from pattern
        if (
            (str_starts_with($pattern, "'") && str_ends_with($pattern, "'"))
            || (str_starts_with($pattern, '"') && str_ends_with($pattern, '"'))
        ) {
            $pattern = substr($pattern, 1, -1);
        }
        // ReDoS guard: reject patterns exhibiting catastrophic backtracking or excessive length.
        // Detected forms (in order of coverage):
        //   [+*])[+*{]      — classic nested quantifier via capturing group: (a+)+ or (a+){n,m}
        //   [+*])[+*{]      — same via non-capturing group: (?:a+)+ or (?:a+){n,m}
        //   ({...})[+*{]    — nested range quantifier: (a{2,5})+
        //   ([^|)]*|[^)]*)[+*{] — quantified alternation: (a|b)+
        //   (?...[+*])      — inline-flag or atomic group with quantifier inside
        //   (.+|.+)         — tautological alternation with dot: (.+|.+) variants
        if (
            preg_match('/[+*]\)[+*{]|\(\?:[^)]*[+*]\)[+*{]|\([^)]*\{[0-9,]+\}\)[+*{]|\([^)]*\|[^)]*\)[+*{]|\(\?[^)]*[+*]|\([.][+*]\|[.][+*]\)/', $pattern) === 1
            || strlen($pattern) > self::config()->maxPatternLength
        ) {
            return false;
        }
        // Escape the PCRE delimiter to prevent flag injection (e.g. 'foo/i')
        $safePattern = str_replace('/', '\\/', $pattern);
        $prevBacktrack = ini_set('pcre.backtrack_limit', (string) self::config()->pcreBacktrackLimit);
        $prevRecursion = ini_set('pcre.recursion_limit', (string) self::config()->pcreRecursionLimit);
        try {
            $result = @preg_match('/' . $safePattern . '/u', $val);
        } finally {
            if ($prevBacktrack !== false) {
                ini_set('pcre.backtrack_limit', (string) $prevBacktrack);
            }
            if ($prevRecursion !== false) {
                ini_set('pcre.recursion_limit', (string) $prevRecursion);
            }
        }
        return $result === 1;
    }

    /**
     * Evaluates the `keys()` filter function.
     *
     * Returns the number of keys in the resolved array (both list and associative).
     * This matches the JS `Object.keys()` behaviour where numeric indices count as keys.
     * Returns 0 for non-array values.
     *
     * @param  array<mixed>  $item     Data item to operate on.
     * @param  array<string> $funcArgs Parsed function arguments; first arg is the field path.
     * @return int Number of keys in the resolved array.
     */
    private static function evalKeys(array $item, array $funcArgs): int
    {
        $val = self::resolveFilterArg($item, $funcArgs[0] ?? '@');
        if (is_array($val)) {
            return count(array_keys($val));
        }
        return 0;
    }
    /**
     * Evaluates the `starts_with()` filter function.
     *
     * Returns `true` when the resolved string value starts with the given prefix.
     * Returns `false` for non-string values.
     *
     * @param  array<mixed>  $item     Data item to operate on.
     * @param  array<string> $funcArgs Arguments: [0] = field path, [1] = prefix.
     * @return bool
     */
    private static function evalStartsWith(array $item, array $funcArgs): bool
    {
        $val = self::resolveFilterArg($item, $funcArgs[0] ?? '@');
        if (!is_string($val)) {
            return false;
        }
        $prefix = trim($funcArgs[1] ?? '');
        if (
            (str_starts_with($prefix, "'") && str_ends_with($prefix, "'"))
            || (str_starts_with($prefix, '"') && str_ends_with($prefix, '"'))
        ) {
            $prefix = substr($prefix, 1, -1);
        }
        return str_starts_with($val, $prefix);
    }

    /**
     * Evaluates the `contains()` filter function.
     *
     * For string values, returns `true` when the string contains the needle
     * as a substring. For array values, returns `true` when the needle is a
     * member of the array (strict comparison). Returns `false` otherwise.
     *
     * @param  array<mixed>  $item     Data item to operate on.
     * @param  array<string> $funcArgs Arguments: [0] = field path, [1] = needle.
     * @return bool
     */
    private static function evalContains(array $item, array $funcArgs): bool
    {
        $val = self::resolveFilterArg($item, $funcArgs[0] ?? '@');
        $needle = trim($funcArgs[1] ?? '');
        if (
            (str_starts_with($needle, "'") && str_ends_with($needle, "'"))
            || (str_starts_with($needle, '"') && str_ends_with($needle, '"'))
        ) {
            $needle = substr($needle, 1, -1);
        }
        if (is_string($val)) {
            return str_contains($val, $needle);
        }
        if (is_array($val)) {
            return in_array($needle, $val, true);
        }
        return false;
    }

    /**
     * Evaluates the `values()` filter function.
     *
     * Returns the number of values in the resolved array or object.
     * Mirrors the semantics of `keys()` but counts values instead of keys.
     * Returns 0 for non-array values.
     *
     * @param  array<mixed>  $item     Data item to operate on.
     * @param  array<string> $funcArgs Parsed function arguments; first arg is the field path.
     * @return int
     */
    private static function evalValues(array $item, array $funcArgs): int
    {
        $val = self::resolveFilterArg($item, $funcArgs[0] ?? '@');
        if (is_array($val)) {
            return count(array_values($val));
        }
        return 0;
    }

    /**
     * Evaluates a simple binary arithmetic expression within a field string.
     *
     * Handles expressions of the form `fieldA OP fieldB` or `fieldA OP literal`,
     * where OP is one of `+`, `-`, `*`, `/`.
     *
     * Operands prefixed with `@.` or bare names are resolved from `$item`.
     * Numeric literals are parsed directly. Division by zero returns `null`.
     *
     * @param  array<mixed> $item Data item providing field values.
     * @param  string       $expr The arithmetic expression string, e.g. `'price * qty'`.
     * @return float|int|null The numeric result, or `null` when operands are non-numeric.
     */
    private static function resolveArithmetic(array $item, string $expr): float|int|null
    {
        if (preg_match('/^([@\w.]+)\s*([+\-*\/])\s*([@\w.]+|\d+(?:\.\d+)?)$/', $expr, $m) !== 1) {
            return null;
        }

        $toNumber = static function (string $token) use ($item): float|int|null {
            if (is_numeric($token) && !str_starts_with($token, '@')) {
                return str_contains($token, '.') ? (float) $token : (int) $token;
            }
            $val = FilterParser::resolveFilterArg($item, $token);
            if (is_int($val) || is_float($val)) {
                return $val;
            }
            if (is_numeric($val)) {
                return str_contains((string) $val, '.') ? (float) $val : (int) $val;
            }
            return null;
        };

        $left = $toNumber($m[1]);
        $right = $toNumber($m[3]);
        if ($left === null || $right === null) {
            return null;
        }

        return match ($m[2]) {
            '+' => $left + $right,
            '-' => $left - $right,
            '*' => $left * $right,
            default => $right != 0 ? $left / $right : null, // only '/' reaches here (regex-guaranteed)
        };
    }
    /**
     * Resolves a filter argument string to a value within `$item`.
     *
     * `@` and `''` resolve to the full item; `@.field` resolves a sub-field;
     * plain strings resolve the same as sub-fields.
     *
     * @param  array<mixed> $item Data item to operate on.
     * @param  string       $arg  Argument token, e.g. `@`, `@.name`, or `fieldName`.
     * @return mixed Resolved value.
     */
    private static function resolveFilterArg(array $item, string $arg): mixed
    {
        if ($arg === '' || $arg === '@') {
            return $item;
        }
        // @.field.sub → resolve from item
        if (str_starts_with($arg, '@.')) {
            return self::resolveField($item, substr($arg, 2));
        }
        return self::resolveField($item, $arg);
    }

    /**
     * Resolves a dot-separated field path against a data item.
     *
     * For multi-segment paths, each segment is traversed in order.
     * Forbidden keys are rejected via {@see SecurityGuard::assertSafeKey()}.
     *
     * @param  array<mixed> $item  Data item to traverse.
     * @param  string       $field Dot-separated field path, e.g. `profile.name`.
     * @return mixed Value at the resolved path, or `null` if any segment is missing.
     */
    private static function resolveField(array $item, string $field): mixed
    {
        if (str_contains($field, '.')) {
            $current = $item;
            foreach (explode('.', $field) as $key) {
                SecurityGuard::assertSafeKey($key);
                if (is_array($current) && array_key_exists($key, $current)) {
                    $current = $current[$key];
                } else {
                    return null;
                }
            }
            return $current;
        }
        SecurityGuard::assertSafeKey($field);
        return $item[$field] ?? null;
    }
}
