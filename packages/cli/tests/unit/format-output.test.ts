import { describe, it, expect, vi } from "vitest";
import type { AbstractAccessor } from "@safe-access-inline/safe-access-inline";

import { formatOutput } from "../../src/command-handlers";
import * as ch from "../../src/command-handlers";

describe(formatOutput.name, () => {
    const makeAccessor = () =>
        ({
            // pretty=true produz saída com newlines, pretty=false produz saída compacta
            // diferença obrigatória para que o mutante BooleanLiteral (ID 93) seja detectado
            toJson: (p = false) => (p ? '{\n  "a": 1\n}' : '{"a":1}'),
            toYaml: () => "a: 1",
            toToml: () => "a = 1",
            toXml: vi.fn(() => "<a>1</a>"),
            transform: vi.fn((fmt: string) => `transformed:${fmt}`),
        }) as unknown as AbstractAccessor;
    it("formats json with pretty=true adds newlines", () => {
        // mata mutante ID 93: BooleanLiteral false → true no default de pretty
        const acc = makeAccessor();
        expect(ch.formatOutput(acc, "json", true)).toContain("\n");
        expect(ch.formatOutput(acc, "json", false)).not.toContain("\n");
    });

    it("formats json without pretty flag uses compact output", () => {
        const acc = makeAccessor();
        // quando pretty é omitido, formatOutput usa false → saída compacta
        expect(ch.formatOutput(acc, "json")).toBe('{"a":1}');
    });

    it("xml format delegates to toXml() and NOT to transform()", () => {
        // mata mutante ID 98: ConditionalExpression case "xml" → case "yaml"
        const acc = makeAccessor();
        const result = ch.formatOutput(acc, "xml");
        expect(result).toBe("<a>1</a>");
        expect(acc.toXml).toHaveBeenCalledOnce();
        expect(acc.transform).not.toHaveBeenCalled();
    });

    it("formats yaml/toml/custom and fallback", () => {
        const acc = makeAccessor();
        expect(ch.formatOutput(acc, "yaml")).toBe("a: 1");
        expect(ch.formatOutput(acc, "toml")).toBe("a = 1");
        expect(ch.formatOutput(acc, "custom")).toBe("transformed:custom");
        // fallback when format omitted -> pretty JSON (com newlines)
        expect(ch.formatOutput(acc)).toContain("\n");
    });
});
