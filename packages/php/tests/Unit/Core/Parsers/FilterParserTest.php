<?php

use SafeAccessInline\Contracts\FilterCondition;
use SafeAccessInline\Contracts\FilterExpression;
use SafeAccessInline\Core\Config\FilterParserConfig;
use SafeAccessInline\Core\Parsers\FilterParser;

describe(FilterParser::class, function () {

    // ── parse() ───────────────────────────────────────

    it('parse — single condition', function () {
        $expr = FilterParser::parse('age>18');
        expect($expr['conditions'])->toHaveCount(1);
        expect($expr['conditions'][0])->toBe(['field' => 'age', 'operator' => '>', 'value' => 18]);
        expect($expr['logicals'])->toHaveCount(0);
    });

    it('parse — equality with string value', function () {
        $expr = FilterParser::parse("name=='Ana'");
        expect($expr['conditions'][0])->toBe(['field' => 'name', 'operator' => '==', 'value' => 'Ana']);
    });

    it('parse — double-quoted string', function () {
        $expr = FilterParser::parse('name=="Ana"');
        expect($expr['conditions'][0])->toBe(['field' => 'name', 'operator' => '==', 'value' => 'Ana']);
    });

    it('parse — logical AND', function () {
        $expr = FilterParser::parse('age>=18 && active==true');
        expect($expr['conditions'])->toHaveCount(2);
        expect($expr['conditions'][0])->toBe(['field' => 'age', 'operator' => '>=', 'value' => 18]);
        expect($expr['conditions'][1])->toBe(['field' => 'active', 'operator' => '==', 'value' => true]);
        expect($expr['logicals'])->toBe(['&&']);
    });

    it('parse — logical OR', function () {
        $expr = FilterParser::parse("env=='prod' || env=='staging'");
        expect($expr['conditions'])->toHaveCount(2);
        expect($expr['conditions'][0])->toBe(['field' => 'env', 'operator' => '==', 'value' => 'prod']);
        expect($expr['conditions'][1])->toBe(['field' => 'env', 'operator' => '==', 'value' => 'staging']);
        expect($expr['logicals'])->toBe(['||']);
    });

    it('parse — multiple logicals', function () {
        $expr = FilterParser::parse('a==1 && b==2 || c==3');
        expect($expr['conditions'])->toHaveCount(3);
        expect($expr['logicals'])->toBe(['&&', '||']);
    });

    it('parse — all operators', function () {
        $ops = ['==', '!=', '>', '<', '>=', '<='];
        foreach ($ops as $op) {
            $expr = FilterParser::parse("x{$op}5");
            expect($expr['conditions'][0]['operator'])->toBe($op);
            expect($expr['conditions'][0]['value'])->toBe(5);
        }
    });

    it('parse — throws on invalid condition', function () {
        expect(fn () => FilterParser::parse('invalidnooperator'))->toThrow(RuntimeException::class, 'Invalid filter condition');
    });

    // ── parseValue() ──────────────────────────────────

    it('parseValue — boolean true', function () {
        expect(FilterParser::parseValue('true'))->toBeTrue();
    });

    it('parseValue — boolean false', function () {
        expect(FilterParser::parseValue('false'))->toBeFalse();
    });

    it('parseValue — null', function () {
        expect(FilterParser::parseValue('null'))->toBeNull();
    });

    it('parseValue — integer', function () {
        expect(FilterParser::parseValue('42'))->toBe(42);
    });

    it('parseValue — float', function () {
        expect(FilterParser::parseValue('3.14'))->toBe(3.14);
    });

    it('parseValue — negative number', function () {
        expect(FilterParser::parseValue('-7'))->toBe(-7);
    });

    it('parseValue — single-quoted string', function () {
        expect(FilterParser::parseValue("'hello'"))->toBe('hello');
    });

    it('parseValue — double-quoted string', function () {
        expect(FilterParser::parseValue('"world"'))->toBe('world');
    });

    it('parseValue — unquoted non-numeric string', function () {
        expect(FilterParser::parseValue('abc'))->toBe('abc');
    });

    // ── evaluate() ────────────────────────────────────

    it('evaluate — empty conditions returns false', function () {
        expect(FilterParser::evaluate([], ['conditions' => [], 'logicals' => []]))->toBeFalse();
    });

    it('evaluate — equals operator', function () {
        $expr = FilterParser::parse('status==1');
        expect(FilterParser::evaluate(['status' => 1], $expr))->toBeTrue();
        expect(FilterParser::evaluate(['status' => 2], $expr))->toBeFalse();
    });

    it('evaluate — not-equals operator', function () {
        $expr = FilterParser::parse('role!=admin');
        expect(FilterParser::evaluate(['role' => 'user'], $expr))->toBeTrue();
        expect(FilterParser::evaluate(['role' => 'admin'], $expr))->toBeFalse();
    });

    it('evaluate — greater-than operator', function () {
        $expr = FilterParser::parse('age>18');
        expect(FilterParser::evaluate(['age' => 25], $expr))->toBeTrue();
        expect(FilterParser::evaluate(['age' => 18], $expr))->toBeFalse();
        expect(FilterParser::evaluate(['age' => 10], $expr))->toBeFalse();
    });

    it('evaluate — less-than operator', function () {
        $expr = FilterParser::parse('price<100');
        expect(FilterParser::evaluate(['price' => 50], $expr))->toBeTrue();
        expect(FilterParser::evaluate(['price' => 100], $expr))->toBeFalse();
    });

    it('evaluate — greater-or-equal operator', function () {
        $expr = FilterParser::parse('score>=90');
        expect(FilterParser::evaluate(['score' => 90], $expr))->toBeTrue();
        expect(FilterParser::evaluate(['score' => 95], $expr))->toBeTrue();
        expect(FilterParser::evaluate(['score' => 89], $expr))->toBeFalse();
    });

    it('evaluate — less-or-equal operator', function () {
        $expr = FilterParser::parse('count<=5');
        expect(FilterParser::evaluate(['count' => 5], $expr))->toBeTrue();
        expect(FilterParser::evaluate(['count' => 3], $expr))->toBeTrue();
        expect(FilterParser::evaluate(['count' => 6], $expr))->toBeFalse();
    });

    it('evaluate — AND combines conditions', function () {
        $expr = FilterParser::parse('age>=18 && active==true');
        expect(FilterParser::evaluate(['age' => 25, 'active' => true], $expr))->toBeTrue();
        expect(FilterParser::evaluate(['age' => 25, 'active' => false], $expr))->toBeFalse();
        expect(FilterParser::evaluate(['age' => 15, 'active' => true], $expr))->toBeFalse();
    });

    it('evaluate — OR matches either condition', function () {
        $expr = FilterParser::parse("role=='admin' || role=='super'");
        expect(FilterParser::evaluate(['role' => 'admin'], $expr))->toBeTrue();
        expect(FilterParser::evaluate(['role' => 'super'], $expr))->toBeTrue();
        expect(FilterParser::evaluate(['role' => 'user'], $expr))->toBeFalse();
    });

    it('evaluate — nested field resolution', function () {
        $expr = FilterParser::parse("address.city=='NYC'");
        expect(FilterParser::evaluate(['address' => ['city' => 'NYC']], $expr))->toBeTrue();
        expect(FilterParser::evaluate(['address' => ['city' => 'LA']], $expr))->toBeFalse();
    });

    it('evaluate — deeply nested field', function () {
        $expr = FilterParser::parse('a.b.c==42');
        expect(FilterParser::evaluate(['a' => ['b' => ['c' => 42]]], $expr))->toBeTrue();
        expect(FilterParser::evaluate(['a' => ['b' => ['c' => 0]]], $expr))->toBeFalse();
    });

    it('evaluate — missing nested field', function () {
        $expr = FilterParser::parse('x.y.z==1');
        expect(FilterParser::evaluate(['x' => []], $expr))->toBeFalse();
    });

    it('evaluate — boolean value comparison', function () {
        $expr = FilterParser::parse('active==true');
        expect(FilterParser::evaluate(['active' => true], $expr))->toBeTrue();
        expect(FilterParser::evaluate(['active' => false], $expr))->toBeFalse();
    });

    it('evaluate — null value comparison', function () {
        $expr = FilterParser::parse('deleted==null');
        expect(FilterParser::evaluate(['deleted' => null], $expr))->toBeTrue();
        expect(FilterParser::evaluate(['deleted' => 'yes'], $expr))->toBeFalse();
    });

    // ── splitLogical (via parse — string-aware) ───────

    it('parse — does not split on AND inside quoted string', function () {
        $expr = FilterParser::parse("label=='a && b'");
        expect($expr['conditions'])->toHaveCount(1);
        expect($expr['conditions'][0]['value'])->toBe('a && b');
    });

    it('parse — does not split on OR inside quoted string', function () {
        $expr = FilterParser::parse("tag=='x || y'");
        expect($expr['conditions'])->toHaveCount(1);
        expect($expr['conditions'][0]['value'])->toBe('x || y');
    });

    // ── SEC-01 / SEC-05 regression: evalMatch hardening ──

    it('evaluate — match with slash in pattern does not inject flags', function () {
        $expr = FilterParser::parse("match(@.url,'https://example')");
        expect(FilterParser::evaluate(['url' => 'https://example.com'], $expr))->toBeTrue();
        expect(FilterParser::evaluate(['url' => 'ftp://other'], $expr))->toBeFalse();
    });

    it('evaluate — match with catastrophic backtracking pattern returns false', function () {
        // ReDoS-style pattern with limited backtrack should not hang
        $expr = FilterParser::parse("match(@.val,'a+a+a+a+a+a+a+a+a+a+b')");
        $evil = str_repeat('a', 50);
        // Should complete quickly due to backtrack limit; result is false (no match)
        expect(FilterParser::evaluate(['val' => $evil], $expr))->toBeFalse();
    });

    it('evaluate — length() on non-string/non-array returns 0', function () {
        $expr = FilterParser::parse('length(@.val) == 0');
        expect(FilterParser::evaluate(['val' => 42], $expr))->toBeTrue();
    });

    it('evaluate — match() on non-string value returns false', function () {
        $expr = FilterParser::parse("match(@.val,'pattern')");
        expect(FilterParser::evaluate(['val' => 123], $expr))->toBeFalse();
    });

    it('evaluate — keys() on list array returns 0', function () {
        $expr = FilterParser::parse('keys(@.val) == 0');
        expect(FilterParser::evaluate(['val' => [1, 2, 3]], $expr))->toBeTrue();
    });

    it('evaluate — match with ReDoS oversized pattern is rejected', function () {
        $longPattern = str_repeat('a', 257);
        $expr = FilterParser::parse("match(@.val,'{$longPattern}')");
        // Pattern rejected by ReDoS guard (>256 chars) → returns false
        expect(FilterParser::evaluate(['val' => 'aaaaab'], $expr))->toBeFalse();
    });

    // ── FilterCondition DTO ─────────────────────────────

    it('FilterCondition — constructor stores field, operator, value and optional fields', function () {
        $cond = new FilterCondition(field: 'age', operator: '>', value: 18);

        expect($cond->field)->toBe('age')
            ->and($cond->operator)->toBe('>')
            ->and($cond->value)->toBe(18)
            ->and($cond->func)->toBeNull()
            ->and($cond->funcArgs)->toBeNull();
    });

    it('FilterCondition — constructor stores optional func and funcArgs', function () {
        $cond = new FilterCondition(
            field:    '@.name',
            operator: '>',
            value:    3,
            func:     'length',
            funcArgs: [],
        );

        expect($cond->func)->toBe('length')
            ->and($cond->funcArgs)->toBe([]);
    });

    // ── FilterExpression DTO ───────────────────────────

    it('FilterExpression — constructor stores conditions list and logicals list', function () {
        $cond = new FilterCondition(field: 'active', operator: '==', value: true);
        $expr = new FilterExpression(conditions: [$cond], logicals: []);

        expect($expr->conditions)->toHaveCount(1)
            ->and($expr->conditions[0])->toBe($cond)
            ->and($expr->logicals)->toBe([]);
    });

    it('configure — sets custom FilterParserConfig', function () {
        FilterParser::configure(new FilterParserConfig(maxPatternLength: 64));
        $expr = FilterParser::parse('@.name == "test"');
        expect($expr['conditions'])->toHaveCount(1);
        FilterParser::resetConfig();
    });

    it('resetConfig — restores default configuration', function () {
        FilterParser::configure(new FilterParserConfig(maxPatternLength: 1));
        FilterParser::resetConfig();
        $item = ['name' => 'hello'];
        $expr = FilterParser::parse('match(@.name, "^h")') ;
        expect(FilterParser::evaluate($item, $expr))->toBeTrue();
    });

    it('resolveFilterArg resolves bare field name without @. prefix via function call', function () {
        $expr = FilterParser::parse('length(name) > 3');
        expect(FilterParser::evaluate(['name' => 'hello'], $expr))->toBeTrue();
        expect(FilterParser::evaluate(['name' => 'hi'], $expr))->toBeFalse();
    });
});
