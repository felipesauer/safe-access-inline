import { describe, it, expect } from 'vitest';
import { FilterParser } from '../../../src/core/filter-parser';

describe(FilterParser.name, () => {
    // ── parse() ───────────────────────────────────────

    it('parse — single condition', () => {
        const expr = FilterParser.parse('age>18');
        expect(expr.conditions).toHaveLength(1);
        expect(expr.conditions[0]).toEqual({ field: 'age', operator: '>', value: 18 });
        expect(expr.logicals).toHaveLength(0);
    });

    it('parse — equality with string value', () => {
        const expr = FilterParser.parse("name=='Ana'");
        expect(expr.conditions[0]).toEqual({ field: 'name', operator: '==', value: 'Ana' });
    });

    it('parse — double-quoted string', () => {
        const expr = FilterParser.parse('name=="Ana"');
        expect(expr.conditions[0]).toEqual({ field: 'name', operator: '==', value: 'Ana' });
    });

    it('parse — logical AND', () => {
        const expr = FilterParser.parse('age>=18 && active==true');
        expect(expr.conditions).toHaveLength(2);
        expect(expr.conditions[0]).toEqual({ field: 'age', operator: '>=', value: 18 });
        expect(expr.conditions[1]).toEqual({ field: 'active', operator: '==', value: true });
        expect(expr.logicals).toEqual(['&&']);
    });

    it('parse — logical OR', () => {
        const expr = FilterParser.parse("env=='prod' || env=='staging'");
        expect(expr.conditions).toHaveLength(2);
        expect(expr.conditions[0]).toEqual({ field: 'env', operator: '==', value: 'prod' });
        expect(expr.conditions[1]).toEqual({ field: 'env', operator: '==', value: 'staging' });
        expect(expr.logicals).toEqual(['||']);
    });

    it('parse — multiple logicals', () => {
        const expr = FilterParser.parse('a==1 && b==2 || c==3');
        expect(expr.conditions).toHaveLength(3);
        expect(expr.logicals).toEqual(['&&', '||']);
    });

    it('parse — all operators', () => {
        const ops = ['==', '!=', '>', '<', '>=', '<='] as const;
        for (const op of ops) {
            const expr = FilterParser.parse(`x${op}5`);
            expect(expr.conditions[0].operator).toBe(op);
            expect(expr.conditions[0].value).toBe(5);
        }
    });

    it('parse — throws on invalid condition', () => {
        expect(() => FilterParser.parse('invalidnooperator')).toThrow('Invalid filter condition');
    });

    // ── parseValue() ──────────────────────────────────

    it('parseValue — boolean true', () => {
        expect(FilterParser.parseValue('true')).toBe(true);
    });

    it('parseValue — boolean false', () => {
        expect(FilterParser.parseValue('false')).toBe(false);
    });

    it('parseValue — null', () => {
        expect(FilterParser.parseValue('null')).toBeNull();
    });

    it('parseValue — integer', () => {
        expect(FilterParser.parseValue('42')).toBe(42);
    });

    it('parseValue — float', () => {
        expect(FilterParser.parseValue('3.14')).toBe(3.14);
    });

    it('parseValue — negative number', () => {
        expect(FilterParser.parseValue('-7')).toBe(-7);
    });

    it('parseValue — single-quoted string', () => {
        expect(FilterParser.parseValue("'hello'")).toBe('hello');
    });

    it('parseValue — double-quoted string', () => {
        expect(FilterParser.parseValue('"world"')).toBe('world');
    });

    it('parseValue — unquoted non-numeric string', () => {
        expect(FilterParser.parseValue('abc')).toBe('abc');
    });

    // ── evaluate() ────────────────────────────────────

    it('evaluate — empty conditions returns false', () => {
        expect(FilterParser.evaluate({}, { conditions: [], logicals: [] })).toBe(false);
    });

    it('evaluate — == operator', () => {
        const expr = FilterParser.parse('status==1');
        expect(FilterParser.evaluate({ status: 1 }, expr)).toBe(true);
        expect(FilterParser.evaluate({ status: 2 }, expr)).toBe(false);
    });

    it('evaluate — != operator', () => {
        const expr = FilterParser.parse('role!=admin');
        expect(FilterParser.evaluate({ role: 'user' }, expr)).toBe(true);
        expect(FilterParser.evaluate({ role: 'admin' }, expr)).toBe(false);
    });

    it('evaluate — > operator', () => {
        const expr = FilterParser.parse('age>18');
        expect(FilterParser.evaluate({ age: 25 }, expr)).toBe(true);
        expect(FilterParser.evaluate({ age: 18 }, expr)).toBe(false);
        expect(FilterParser.evaluate({ age: 10 }, expr)).toBe(false);
    });

    it('evaluate — < operator', () => {
        const expr = FilterParser.parse('price<100');
        expect(FilterParser.evaluate({ price: 50 }, expr)).toBe(true);
        expect(FilterParser.evaluate({ price: 100 }, expr)).toBe(false);
    });

    it('evaluate — >= operator', () => {
        const expr = FilterParser.parse('score>=90');
        expect(FilterParser.evaluate({ score: 90 }, expr)).toBe(true);
        expect(FilterParser.evaluate({ score: 95 }, expr)).toBe(true);
        expect(FilterParser.evaluate({ score: 89 }, expr)).toBe(false);
    });

    it('evaluate — <= operator', () => {
        const expr = FilterParser.parse('count<=5');
        expect(FilterParser.evaluate({ count: 5 }, expr)).toBe(true);
        expect(FilterParser.evaluate({ count: 3 }, expr)).toBe(true);
        expect(FilterParser.evaluate({ count: 6 }, expr)).toBe(false);
    });

    it('evaluate — && combines conditions', () => {
        const expr = FilterParser.parse('age>=18 && active==true');
        expect(FilterParser.evaluate({ age: 25, active: true }, expr)).toBe(true);
        expect(FilterParser.evaluate({ age: 25, active: false }, expr)).toBe(false);
        expect(FilterParser.evaluate({ age: 15, active: true }, expr)).toBe(false);
    });

    it('evaluate — || matches either condition', () => {
        const expr = FilterParser.parse("role=='admin' || role=='super'");
        expect(FilterParser.evaluate({ role: 'admin' }, expr)).toBe(true);
        expect(FilterParser.evaluate({ role: 'super' }, expr)).toBe(true);
        expect(FilterParser.evaluate({ role: 'user' }, expr)).toBe(false);
    });

    it('evaluate — nested field resolution', () => {
        const expr = FilterParser.parse("address.city=='NYC'");
        expect(FilterParser.evaluate({ address: { city: 'NYC' } }, expr)).toBe(true);
        expect(FilterParser.evaluate({ address: { city: 'LA' } }, expr)).toBe(false);
    });

    it('evaluate — deeply nested field', () => {
        const expr = FilterParser.parse('a.b.c==42');
        expect(FilterParser.evaluate({ a: { b: { c: 42 } } }, expr)).toBe(true);
        expect(FilterParser.evaluate({ a: { b: { c: 0 } } }, expr)).toBe(false);
    });

    it('evaluate — missing nested field', () => {
        const expr = FilterParser.parse('x.y.z==1');
        expect(FilterParser.evaluate({ x: {} }, expr)).toBe(false);
    });

    it('evaluate — boolean value comparison', () => {
        const expr = FilterParser.parse('active==true');
        expect(FilterParser.evaluate({ active: true }, expr)).toBe(true);
        expect(FilterParser.evaluate({ active: false }, expr)).toBe(false);
    });

    it('evaluate — null value comparison', () => {
        const expr = FilterParser.parse('deleted==null');
        expect(FilterParser.evaluate({ deleted: null }, expr)).toBe(true);
        expect(FilterParser.evaluate({ deleted: false }, expr)).toBe(false);
    });

    // ── splitLogical (via parse — string-aware) ───────

    it('parse — does not split on && inside quoted string', () => {
        const expr = FilterParser.parse("label=='a && b'");
        expect(expr.conditions).toHaveLength(1);
        expect(expr.conditions[0].value).toBe('a && b');
    });

    it('parse — does not split on || inside quoted string', () => {
        const expr = FilterParser.parse("tag=='x || y'");
        expect(expr.conditions).toHaveLength(1);
        expect(expr.conditions[0].value).toBe('x || y');
    });

    // ── Function support edge cases ───────

    it('parse — function with empty args defaults field to @', () => {
        const expr = FilterParser.parse('length()>0');
        expect(expr.conditions[0].func).toBe('length');
        expect(expr.conditions[0].field).toBe('@');
    });

    it('parse — boolean function with empty args defaults field to @', () => {
        const expr = FilterParser.parse('match()');
        expect(expr.conditions[0].func).toBe('match');
        expect(expr.conditions[0].field).toBe('@');
        expect(expr.conditions[0].value).toBe(true);
    });

    it('evaluate — match with double-quoted pattern', () => {
        const expr = FilterParser.parse('match(@.name,"Al.*")');
        expect(FilterParser.evaluate({ name: 'Alice' }, expr)).toBe(true);
        expect(FilterParser.evaluate({ name: 'Bob' }, expr)).toBe(false);
    });

    it('evaluate — match on non-string returns false', () => {
        const expr = FilterParser.parse("match(@.val,'.*')");
        expect(FilterParser.evaluate({ val: 42 } as Record<string, unknown>, expr)).toBe(false);
    });

    it('evaluate — keys on array returns 0', () => {
        const expr = FilterParser.parse('keys(@)>0');
        expect(
            FilterParser.evaluate({ items: [1, 2] } as unknown as Record<string, unknown>, expr),
        ).toBe(true);
        expect(FilterParser.evaluate([1, 2] as unknown as Record<string, unknown>, expr)).toBe(
            false,
        );
    });

    it('evaluate — resolveFilterArg with @.nested.path', () => {
        const expr = FilterParser.parse('length(@.profile.bio)>2');
        expect(FilterParser.evaluate({ profile: { bio: 'Hello world' } }, expr)).toBe(true);
        expect(FilterParser.evaluate({ profile: { bio: 'Hi' } }, expr)).toBe(false);
    });

    it('evaluate — resolveFilterArg with plain field (no @)', () => {
        const expr = FilterParser.parse('length(name)>3');
        expect(FilterParser.evaluate({ name: 'Alice' }, expr)).toBe(true);
        expect(FilterParser.evaluate({ name: 'Bob' }, expr)).toBe(false);
    });

    it('evaluate — <= operator', () => {
        const expr = FilterParser.parse('age<=18');
        expect(FilterParser.evaluate({ age: 18 }, expr)).toBe(true);
        expect(FilterParser.evaluate({ age: 19 }, expr)).toBe(false);
    });

    it('evaluate — < operator', () => {
        const expr = FilterParser.parse('age<18');
        expect(FilterParser.evaluate({ age: 17 }, expr)).toBe(true);
        expect(FilterParser.evaluate({ age: 18 }, expr)).toBe(false);
    });

    it('evaluate — unknown function throws', () => {
        const expr = FilterParser.parse('unknown(@)>0');
        expect(() => FilterParser.evaluate({ x: 1 }, expr)).toThrow('Unknown filter function');
    });

    it('evaluate — length on primitive returns 0', () => {
        const expr = FilterParser.parse('length(@.val)>0');
        expect(FilterParser.evaluate({ val: 42 } as Record<string, unknown>, expr)).toBe(false);
    });
});
