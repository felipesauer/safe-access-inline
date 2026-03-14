<?php

namespace SafeAccessInline\Core;

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
 *
 * Operators: ==, !=, >, <, >=, <=
 * Logical:   &&, ||
 * Values:    number, 'string', "string", true, false, null
 * Functions: length(@.field), match(@.field, 'pattern'), keys(@)
 */
final class FilterParser
{
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
            $conditions[] = self::parseCondition(trim($token));
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

        for ($i = 0; $i < count($expr['logicals']); $i++) {
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
     * @param string $expression
     * @return array{tokens: array<string>, operators: array<string>}
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
     * @param string $token
     * @return array{field: string, operator: string, value: mixed, func?: string, funcArgs?: array<string>}
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
                'field' => $funcArgs[0] ?? '@',
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
                'field' => $funcArgs[0] ?? '@',
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
     * @param string $raw
     * @return mixed
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
     * @param array<mixed> $item
     * @param array{field: string, operator: string, value: mixed, func?: string, funcArgs?: array<string>} $condition
     * @return bool
     */
    private static function evaluateCondition(array $item, array $condition): bool
    {
        if (isset($condition['func'])) {
            $fieldValue = self::evaluateFunction($item, $condition['func'], $condition['funcArgs'] ?? []);
        } else {
            $fieldValue = self::resolveField($item, $condition['field']);
        }

        $expected = $condition['value'];

        return match ($condition['operator']) {
            '==' => $fieldValue == $expected,
            '!=' => $fieldValue != $expected,
            '>' => $fieldValue > $expected,
            '<' => $fieldValue < $expected,
            '>=' => $fieldValue >= $expected,
            '<=' => $fieldValue <= $expected,
            default => false,
        };
    }

    /**
     * @param array<mixed> $item
     * @param string $func
     * @param array<string> $funcArgs
     * @return mixed
     */
    private static function evaluateFunction(array $item, string $func, array $funcArgs): mixed
    {
        return match ($func) {
            'length' => self::evalLength($item, $funcArgs),
            'match' => self::evalMatch($item, $funcArgs),
            'keys' => self::evalKeys($item, $funcArgs),
            default => throw new \RuntimeException("Unknown filter function: \"{$func}\""),
        };
    }

    /**
     * @param array<mixed> $item
     * @param array<string> $funcArgs
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
        return (bool) preg_match('/' . $pattern . '/', $val);
    }

    /**
     * @param array<mixed> $item
     * @param array<string> $funcArgs
     */
    private static function evalKeys(array $item, array $funcArgs): int
    {
        $val = self::resolveFilterArg($item, $funcArgs[0] ?? '@');
        if (is_array($val) && !array_is_list($val)) {
            return count(array_keys($val));
        }
        return 0;
    }

    /**
     * @param array<mixed> $item
     * @param string $arg
     * @return mixed
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
     * @param array<mixed> $item
     * @param string $field
     * @return mixed
     */
    private static function resolveField(array $item, string $field): mixed
    {
        if (str_contains($field, '.')) {
            $current = $item;
            foreach (explode('.', $field) as $key) {
                if (is_array($current) && array_key_exists($key, $current)) {
                    $current = $current[$key];
                } else {
                    return null;
                }
            }
            return $current;
        }
        return $item[$field] ?? null;
    }
}
