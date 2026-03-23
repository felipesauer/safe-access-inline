import { describe, it, expect } from 'vitest';
import { FilterParser } from '../../../../src/core/parsers/filter-parser';
import type { FilterExpression } from '../../../../src/contracts/filter-expression.interface';

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

    // ── C2: null / undefined equivalence (PHP–JS alignment) ─────────────

    it('evaluate == null — absent field (undefined) matches null (PHP alignment)', () => {
        // PHP returns null for absent paths; JS returns undefined.
        // [?field == null] must match both to be cross-language consistent.
        const expr = FilterParser.parse('score==null');
        expect(FilterParser.evaluate({}, expr)).toBe(true); // undefined ≡ null
        expect(FilterParser.evaluate({ score: null }, expr)).toBe(true); // explicit null
        expect(FilterParser.evaluate({ score: 0 }, expr)).toBe(false); // 0 is not null
        expect(FilterParser.evaluate({ score: false }, expr)).toBe(false); // false is not null
    });

    it('evaluate != null — absent field (undefined) treated as null so != null is false', () => {
        const expr = FilterParser.parse('score!=null');
        expect(FilterParser.evaluate({}, expr)).toBe(false); // undefined ≡ null → equal
        expect(FilterParser.evaluate({ score: null }, expr)).toBe(false);
        expect(FilterParser.evaluate({ score: 0 }, expr)).toBe(true); // 0 ≠ null
        expect(FilterParser.evaluate({ score: 'x' }, expr)).toBe(true);
    });

    it('evaluate == null — does NOT coerce 0, false, or empty string to null', () => {
        // null-equivalence is ONLY between null and undefined — no broader coercion.
        const expr = FilterParser.parse('val==null');
        expect(FilterParser.evaluate({ val: 0 }, expr)).toBe(false);
        expect(FilterParser.evaluate({ val: false }, expr)).toBe(false);
        expect(FilterParser.evaluate({ val: '' }, expr)).toBe(false);
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

    it('evaluate — match with missing pattern argument uses empty pattern', () => {
        // match(@.name) without a second argument — funcArgs[1] is undefined
        const expr = FilterParser.parse('match(@.name)');
        // Empty pattern matches any string
        expect(FilterParser.evaluate({ name: 'anything' }, expr)).toBe(true);
    });

    // ── SEC-02 regression: invalid regex returns false ──

    it('evaluate — match with invalid regex returns false', () => {
        const expr = FilterParser.parse("match(@.val,'[invalid')");
        expect(FilterParser.evaluate({ val: 'anything' }, expr)).toBe(false);
    });

    it('evaluate — match with slash in pattern works correctly', () => {
        const expr = FilterParser.parse("match(@.url,'https://example')");
        expect(FilterParser.evaluate({ url: 'https://example.com' }, expr)).toBe(true);
        expect(FilterParser.evaluate({ url: 'ftp://other' }, expr)).toBe(false);
    });

    it('evaluate — match returns false for non-capturing group with quantifier inside (ReDoS guard)', () => {
        // Pattern > 128 chars triggers the length-based ReDoS guard → return false
        const longPattern = 'a'.repeat(130);
        const expr = FilterParser.parse(`match(@.name,'${longPattern}')`);
        expect(FilterParser.evaluate({ name: 'a'.repeat(130) }, expr)).toBe(false);
    });

    it('evaluate — accessing a non-existent simple field returns undefined (covers hasOwnProperty false branch)', () => {
        // 'missing' is not in { x: 1 } → hasOwnProperty returns false → undefined → comparison fails
        const expr = FilterParser.parse('missing==1');
        expect(FilterParser.evaluate({ x: 1 }, expr)).toBe(false);
    });

    // ── parseValue — partial quotes must NOT be stripped ─────────────────

    it('parseValue — value with only opening single-quote is returned as-is (not stripped)', () => {
        // Kills LogicalOperator mutant: startsWith("'") || endsWith("'") → should require BOTH
        expect(FilterParser.parseValue("'hello")).toBe("'hello");
    });

    it('parseValue — value with only closing single-quote is returned as-is (not stripped)', () => {
        expect(FilterParser.parseValue("hello'")).toBe("hello'");
    });

    it('parseValue — value with only opening double-quote is returned as-is (not stripped)', () => {
        expect(FilterParser.parseValue('"hello')).toBe('"hello');
    });

    it('parseValue — value with only closing double-quote is returned as-is (not stripped)', () => {
        expect(FilterParser.parseValue('hello"')).toBe('hello"');
    });

    it('parseValue — fully single-quoted value is stripped correctly', () => {
        expect(FilterParser.parseValue("'hello'")).toBe('hello');
    });

    it('parseValue — fully double-quoted value is stripped correctly', () => {
        expect(FilterParser.parseValue('"hello"')).toBe('hello');
    });

    // ── match() — pattern length boundary ────────────────────────────────

    it('evaluate — match with pattern of exactly 128 chars is NOT blocked by length guard', () => {
        // Kills EqualityOperator mutant: > maxPatternLength vs >= maxPatternLength
        // 128 > 128 = false → runs regex. 128 >= 128 = true → blocked.
        const pattern = 'a'.repeat(128);
        const expr = FilterParser.parse(`match(@.name,'${pattern}')`);
        // Pattern of 128 'a's matches a name of 128 'a's
        expect(FilterParser.evaluate({ name: 'a'.repeat(128) }, expr)).toBe(true);
    });

    it('evaluate — match with pattern of 129 chars IS blocked by length guard', () => {
        const pattern = 'a'.repeat(129);
        const expr = FilterParser.parse(`match(@.name,'${pattern}')`);
        expect(FilterParser.evaluate({ name: 'a'.repeat(129) }, expr)).toBe(false);
    });

    // ── match() — ReDoS guards ────────────────────────────────────────────

    it('evaluate — match allows simple non-greedy pattern matching (no special quantifiers)', () => {
        // Confirms the match() happy path works after guards pass
        const expr = FilterParser.parse("match(@.v,'a+b')");
        expect(FilterParser.evaluate({ v: 'aaab' }, expr)).toBe(true);
        expect(FilterParser.evaluate({ v: 'ccc' }, expr)).toBe(false);
    });

    it('evaluate — match with alternation pattern without outer quantifier (safe)', () => {
        // Pattern: 'cat|dog' — no outer quantifier, no nested group → safe
        const expr = FilterParser.parse("match(@.v,'cat|dog')");
        expect(FilterParser.evaluate({ v: 'cat' }, expr)).toBe(true);
        expect(FilterParser.evaluate({ v: 'dog' }, expr)).toBe(true);
        expect(FilterParser.evaluate({ v: 'fish' }, expr)).toBe(false);
    });

    it('evaluate — match with (a+)+ nested quantifier group is rejected by ReDoS guard', () => {
        // Guard 2: /(\.\+|\*|\{[\d,]+\})\)(\+|\*|\{[\d,]+\})/ matches `+)+` in `(a+)+`
        // Construct the expression directly — parser cannot parse `)` inside quoted args
        const expr: FilterExpression = {
            conditions: [
                {
                    field: '@.v',
                    operator: '==',
                    value: true,
                    func: 'match',
                    funcArgs: ['@.v', '(a+)+'],
                },
            ],
            logicals: [],
        };
        expect(FilterParser.evaluate({ v: 'aaaa' }, expr)).toBe(false);
    });

    it('evaluate — match with (a|b)+ alternation quantifier is rejected by ReDoS guard', () => {
        // Guard 3: /\([^)]*\|[^)]*\)(\+|\*|\{[\d,]+\})/ matches `(a|b)+`
        // Construct the expression directly — parser cannot parse `)` inside quoted args
        const expr: FilterExpression = {
            conditions: [
                {
                    field: '@.v',
                    operator: '==',
                    value: true,
                    func: 'match',
                    funcArgs: ['@.v', '(a|b)+c'],
                },
            ],
            logicals: [],
        };
        expect(FilterParser.evaluate({ v: 'aaac' }, expr)).toBe(false);
    });

    it('evaluate — match with (?:a+)* non-capturing quantifier is rejected by ReDoS guard', () => {
        // Guard 4: /\(\?[^)]*[+*]/ matches `(?:a+` in `(?:a+)*`
        // Construct the expression directly — parser cannot parse `)` inside quoted args
        const expr: FilterExpression = {
            conditions: [
                {
                    field: '@.v',
                    operator: '==',
                    value: true,
                    func: 'match',
                    funcArgs: ['@.v', '(?:a+)*b'],
                },
            ],
            logicals: [],
        };
        expect(FilterParser.evaluate({ v: 'aaab' }, expr)).toBe(false);
    });

    // ── match() — pattern quote handling (L242-243) ───────────────────────

    it('evaluate — match pattern with only opening single-quote is not stripped', () => {
        // Pattern arg "'test" — startsWith but NOT endsWith → stays as "'test"
        // Kills LogicalOperator mutant in match() quote-stripping logic
        const expr = FilterParser.parse('match(@.name,"\'test")');
        // With mutant (||): opens quote → stripped to "test", matches name="test"
        // With original (&&): not stripped → pattern is "'test", matches name="'test"
        expect(FilterParser.evaluate({ name: "'test" }, expr)).toBe(true);
        expect(FilterParser.evaluate({ name: 'test' }, expr)).toBe(false);
    });

    // ── keys() — null safety guard (L265) ────────────────────────────────

    it('evaluate — keys() on null value returns 0 (null-safety guard)', () => {
        // Kills LogicalOperator mutant: typeof val === 'object' || val !== null → &&
        const expr = FilterParser.parse('keys(@.obj)>0');
        expect(
            FilterParser.evaluate({ obj: null } as unknown as Record<string, unknown>, expr),
        ).toBe(false);
    });
});

describe('FilterParser configuration', () => {
    it('configure and resetConfig', () => {
        // Configure to a small value
        FilterParser.configure({ maxPatternLength: 10 });
        // This pattern is 14 chars long, which is > 10. ReDoS guard should reject.
        let expr = FilterParser.parse("match(@.name,'a-long-pattern')");
        expect(FilterParser.evaluate({ name: 'a-long-pattern' }, expr)).toBe(false);

        // Reset the config
        FilterParser.resetConfig();
        // Default maxPatternLength is larger, so this should now pass
        expr = FilterParser.parse("match(@.name,'a-long-pattern')");
        expect(FilterParser.evaluate({ name: 'a-long-pattern' }, expr)).toBe(true);
    });
});

// ── Security regression: numeric comparisons must not coerce string fields ──
describe('FilterParser — numeric type guard regression', () => {
    it('> returns false when field is a string (no implicit JS coercion "10" > 5 = true)', () => {
        const expr = FilterParser.parse('price>5');
        // Without type guard: '10' > 5 → true (JavaScript coercion)
        expect(FilterParser.evaluate({ price: '10' }, expr)).toBe(false);
    });

    it('< returns false when field is a string', () => {
        const expr = FilterParser.parse('price<100');
        expect(FilterParser.evaluate({ price: '50' }, expr)).toBe(false);
    });

    it('>= returns false when field is a string', () => {
        const expr = FilterParser.parse('score>=90');
        expect(FilterParser.evaluate({ score: '95' }, expr)).toBe(false);
    });

    it('<= returns false when field is a string', () => {
        const expr = FilterParser.parse('count<=5');
        expect(FilterParser.evaluate({ count: '3' }, expr)).toBe(false);
    });

    it('> still works correctly when both sides are numbers', () => {
        const expr = FilterParser.parse('price>5');
        expect(FilterParser.evaluate({ price: 10 }, expr)).toBe(true);
        expect(FilterParser.evaluate({ price: 3 }, expr)).toBe(false);
    });

    // ── starts_with() ─────────────────────────────────

    it('evaluate — starts_with returns true when field starts with prefix', () => {
        const expr = FilterParser.parse("starts_with(@.name,'Ana')");
        expect(FilterParser.evaluate({ name: 'Ana Lima' }, expr)).toBe(true);
        expect(FilterParser.evaluate({ name: 'João' }, expr)).toBe(false);
    });

    it('evaluate — starts_with returns false for non-string field', () => {
        const expr = FilterParser.parse("starts_with(@.age,'4')");
        expect(FilterParser.evaluate({ age: 42 }, expr)).toBe(false);
    });

    it('evaluate — starts_with handles double-quoted prefix', () => {
        const expr = FilterParser.parse('starts_with(@.name,"Ana")');
        expect(FilterParser.evaluate({ name: 'Ana Lima' }, expr)).toBe(true);
    });

    // ── contains() ────────────────────────────────────

    it('evaluate — contains returns true when string field contains needle', () => {
        const expr = FilterParser.parse("contains(@.name,'silva')");
        expect(FilterParser.evaluate({ name: 'Ana silva' }, expr)).toBe(true);
        expect(FilterParser.evaluate({ name: 'João Lima' }, expr)).toBe(false);
    });

    it('evaluate — contains returns true when array field contains element', () => {
        const expr = FilterParser.parse("contains(@.tags,'admin')");
        expect(FilterParser.evaluate({ tags: ['user', 'admin'] }, expr)).toBe(true);
        expect(FilterParser.evaluate({ tags: ['user'] }, expr)).toBe(false);
    });

    it('evaluate — contains returns false for non-string non-array field', () => {
        const expr = FilterParser.parse("contains(@.count,'1')");
        expect(FilterParser.evaluate({ count: 10 }, expr)).toBe(false);
    });

    // ── values() ──────────────────────────────────────

    it('evaluate — values returns object value count', () => {
        const exprGt = FilterParser.parse('values(@)>2');
        expect(FilterParser.evaluate({ a: 1, b: 2, c: 3 }, exprGt)).toBe(true);
        expect(FilterParser.evaluate({ a: 1, b: 2 }, exprGt)).toBe(false);
    });

    it('evaluate — values returns 0 for non-object non-array', () => {
        const expr = FilterParser.parse('values(@)>0');
        expect(FilterParser.evaluate('hello' as unknown as Record<string, unknown>, expr)).toBe(
            false,
        );
    });

    // ── arithmetic ────────────────────────────────────

    it('evaluate — arithmetic price * qty > 100', () => {
        const expr = FilterParser.parse('price * qty > 100');
        expect(FilterParser.evaluate({ price: 20, qty: 6 }, expr)).toBe(true);
        expect(FilterParser.evaluate({ price: 5, qty: 10 }, expr)).toBe(false);
    });

    it('evaluate — arithmetic addition field + field > value', () => {
        const expr = FilterParser.parse('a + b > 10');
        expect(FilterParser.evaluate({ a: 7, b: 5 }, expr)).toBe(true);
        expect(FilterParser.evaluate({ a: 2, b: 3 }, expr)).toBe(false);
    });

    it('evaluate — arithmetic with @.field prefix', () => {
        const expr = FilterParser.parse('@.price * @.qty > 50');
        expect(FilterParser.evaluate({ price: 10, qty: 6 }, expr)).toBe(true);
    });

    it('evaluate — arithmetic returns undefined for non-numeric operands', () => {
        const expr = FilterParser.parse('price * name > 10');
        expect(FilterParser.evaluate({ price: 5, name: 'hello' }, expr)).toBe(false);
    });

    // ── splitLogical — quoted string edge cases ────────

    it("parse — '&&' inside a quoted string value is not treated as a logical operator", () => {
        // The condition value contains '&&' literally; it must be parsed as one condition
        const expr = FilterParser.parse("label=='a&&b'");
        expect(expr.conditions).toHaveLength(1);
        expect(expr.conditions[0]).toEqual({ field: 'label', operator: '==', value: 'a&&b' });
        expect(expr.logicals).toHaveLength(0);
    });

    it("parse — '||' inside a quoted string value is not treated as a logical operator", () => {
        const expr = FilterParser.parse('label=="x||y"');
        expect(expr.conditions).toHaveLength(1);
        expect(expr.conditions[0]).toEqual({ field: 'label', operator: '==', value: 'x||y' });
        expect(expr.logicals).toHaveLength(0);
    });

    it('parse — mixed: quoted && inside value alongside a real && logical operator', () => {
        // "label=='a&&b' && active==true"  →  2 conditions, 1 logical
        const expr = FilterParser.parse("label=='a&&b' && active==true");
        expect(expr.conditions).toHaveLength(2);
        expect(expr.conditions[0]).toEqual({ field: 'label', operator: '==', value: 'a&&b' });
        expect(expr.conditions[1]).toEqual({ field: 'active', operator: '==', value: true });
        expect(expr.logicals).toEqual(['&&']);
    });

    it('parse — double-quoted value containing || alongside a real || logical operator', () => {
        const expr = FilterParser.parse('env=="a||b" || env=="prod"');
        expect(expr.conditions).toHaveLength(2);
        expect(expr.conditions[0]).toEqual({ field: 'env', operator: '==', value: 'a||b' });
        expect(expr.conditions[1]).toEqual({ field: 'env', operator: '==', value: 'prod' });
        expect(expr.logicals).toEqual(['||']);
    });

    // ── arithmetic edge cases (lines 418, 422, 424) ────────────

    it('evaluate — arithmetic subtraction field - field > value (line 418)', () => {
        const expr = FilterParser.parse('a - b > 2');
        expect(FilterParser.evaluate({ a: 10, b: 5 }, expr)).toBe(true);
        expect(FilterParser.evaluate({ a: 3, b: 2 }, expr)).toBe(false);
    });

    it('evaluate — arithmetic division field / field > value (line 422)', () => {
        const expr = FilterParser.parse('price / qty > 5');
        expect(FilterParser.evaluate({ price: 30, qty: 5 }, expr)).toBe(true);
        expect(FilterParser.evaluate({ price: 10, qty: 5 }, expr)).toBe(false);
    });

    it('evaluate — arithmetic division by zero returns falsy (line 422 false branch)', () => {
        const expr = FilterParser.parse('price / qty > 5');
        expect(FilterParser.evaluate({ price: 30, qty: 0 }, expr)).toBe(false);
    });

    it('evaluate — starts_with with no prefix arg (funcArgs[1] undefined → ?? fallback)', () => {
        // funcArgs[1] is undefined → prefix = '' → val.startsWith('') is always true
        const expr = FilterParser.parse('starts_with(@.name)==true');
        expect(FilterParser.evaluate({ name: 'test' }, expr)).toBe(true);
    });

    it('evaluate — contains with no needle arg (funcArgs[1] undefined → ?? fallback)', () => {
        // funcArgs[1] is undefined → needle = '' → val.includes('') is always true
        const expr = FilterParser.parse('contains(@.name)==true');
        expect(FilterParser.evaluate({ name: 'test' }, expr)).toBe(true);
    });

    it('evaluate — contains with unquoted needle (if-block false branch)', () => {
        // needle = 'silva' (no quotes) → startsWith("'") is false → if-block skipped
        const expr = FilterParser.parse('contains(@.name,silva)==true');
        expect(FilterParser.evaluate({ name: 'Ana silva' }, expr)).toBe(true);
        expect(FilterParser.evaluate({ name: 'João Lima' }, expr)).toBe(false);
    });

    it("evaluate — contains with malformed single-quote needle (starts ' no end ')", () => {
        // needle starts with "'" but doesn't end with "'" → first && is false
        const expr = FilterParser.parse("contains(@.name,'silva)==true");
        // needle = "'silva" (no closing quote) — not stripped — unlikely to match
        expect(FilterParser.evaluate({ name: 'Ana silva' }, expr)).toBe(false);
    });

    it('evaluate — contains with malformed double-quote needle (starts " no end ")', () => {
        // needle starts with '"' but doesn't end with '"' → second && is false
        const expr = FilterParser.parse('contains(@.name,"silva)==true');
        // needle = '"silva' (no closing quote) — not stripped — unlikely to match
        expect(FilterParser.evaluate({ name: 'Ana silva' }, expr)).toBe(false);
    });

    it('evaluate — values returns array length for array value (line 375)', () => {
        // values(@.items) → val is an array → returns val.length
        const expr = FilterParser.parse('values(@.items)>2');
        expect(FilterParser.evaluate({ items: [1, 2, 3] }, expr)).toBe(true);
        expect(FilterParser.evaluate({ items: [1, 2] }, expr)).toBe(false);
    });

    it('evaluate — arithmetic with chained expression (resolveArithmetic regex no match → undefined)', () => {
        // 'a + b + c' matches the outer hasArithmetic check but fails the inner regex
        // → resolveArithmetic returns undefined → fieldValue undefined → comparison false
        const expr = FilterParser.parse('a + b + c > 10');
        expect(FilterParser.evaluate({ a: 5, b: 3, c: 3 }, expr)).toBe(false);
    });

    it('evaluate — arithmetic with numeric literal operand (toNumber → Number(token) path)', () => {
        // token '5' matches /^\d+/ → returns Number('5') directly (line 404 true branch)
        const expr = FilterParser.parse('price + 5 > 10');
        expect(FilterParser.evaluate({ price: 7 }, expr)).toBe(true);
        expect(FilterParser.evaluate({ price: 4 }, expr)).toBe(false);
    });

    it('evaluate — arithmetic with string-encoded number operand (toNumber → Number(val) path)', () => {
        // qty is string '3' → typeof === 'string', !isNaN → returns Number('3') (line 407)
        const expr = FilterParser.parse('price * qty > 10');
        expect(FilterParser.evaluate({ price: 5, qty: '3' }, expr)).toBe(true);
        expect(FilterParser.evaluate({ price: 2, qty: '3' }, expr)).toBe(false);
    });
});
