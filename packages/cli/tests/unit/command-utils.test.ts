import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// Mock SafeAccess before importing the command-handlers so bindings are mocked
vi.mock("@safe-access-inline/safe-access-inline", () => ({
    SafeAccess: {
        from: vi.fn(),
        detect: vi.fn(),
        fromFileSync: vi.fn(),
    },
    mask: vi.fn(),
}));

import * as ch from "../../src/command-handlers";
import { handleMask } from "../../src/handlers/mask.handler";

describe("command handlers utils", () => {
    beforeEach(() => {
        vi.restoreAllMocks();
        vi.clearAllMocks();
    });
    afterEach(() => {
        vi.resetAllMocks();
    });

    it("printValue handles null, undefined, string and objects", () => {
        const out: string[] = [];
        const stdout = { write: (s: string) => out.push(s) };

        ch.printValue(null, stdout);
        ch.printValue(undefined, stdout);
        ch.printValue("hello", stdout);
        ch.printValue({ a: 1 }, stdout);

        expect(out[0]).toBe("null\n");
        expect(out[1]).toBe("null\n");
        expect(out[2]).toBe("hello\n");
        expect(out[3]).toContain('"a": 1');
    });

    it("parseMaskPatterns splits and trims patterns", () => {
        const v = ch.parseMaskPatterns("a, b ,c");
        expect(v).toEqual(["a", "b", "c"]);
    });

    it("parseJsonValue parses JSON or returns raw string", () => {
        expect(ch.parseJsonValue('{"x":1}')).toEqual({ x: 1 });
        expect(ch.parseJsonValue("notjson")).toBe("notjson");
    });

    it("loadFromStdinOrFile reads from stdin when '-' and calls SafeAccess.from/detect", async () => {
        const sa = (await import("@safe-access-inline/safe-access-inline"))
            .SafeAccess as any;

        const readFileFn = vi.fn(() => '{"ok":true}');
        ch.loadFromStdinOrFile("-", undefined, readFileFn as any);
        expect(sa.detect).toHaveBeenCalled();

        ch.loadFromStdinOrFile("-", "json", readFileFn as any);
        expect(sa.from).toHaveBeenCalled();
    });

    it("loadFromStdinOrFile with file path calls fromFileSync WITHOUT format when fromFormat omitted", async () => {
        const sa = (await import("@safe-access-inline/safe-access-inline"))
            .SafeAccess as any;
        ch.loadFromStdinOrFile("./somefile.json", undefined, (() => "") as any);
        expect(sa.fromFileSync).toHaveBeenCalled();
        // mata mutante ID 79: ConditionalExpression → true (sempre usaria fromFormat)
        // sem fromFormat, o argumento options NÃO deve conter a propriedade 'format'
        const [, opts] = sa.fromFileSync.mock.calls.at(-1);
        expect(opts).not.toHaveProperty("format");
        expect(opts).toMatchObject({ allowAnyPath: true });
    });

    it("loadFromStdinOrFile with explicit fromFormat uses format option", async () => {
        const sa = (await import("@safe-access-inline/safe-access-inline"))
            .SafeAccess as any;
        ch.loadFromStdinOrFile("./somefile.json", "json", (() => "") as any);
        expect(sa.fromFileSync).toHaveBeenCalled();
        const call =
            sa.fromFileSync.mock.calls[sa.fromFileSync.mock.calls.length - 1];
        expect(call[1]).toMatchObject({ format: "json" });
    });

    // ID 227 — mask handler calls SafeAccess.from with "object" as format after masking
    it("mask handler calls SafeAccess.from with 'object' as format", async () => {
        const sa = (await import("@safe-access-inline/safe-access-inline"))
            .SafeAccess as any;

        // fromFileSync must return a fake accessor with toObject()
        sa.fromFileSync.mockReturnValueOnce({
            toObject: () => ({ password: "secret" }),
        });
        // from must return a fake masked accessor with toJson() so formatOutput can proceed
        sa.from.mockReturnValueOnce({
            toJson: () => '{"password":"[REDACTED]"}',
        });

        const out: string[] = [];
        const io = {
            stdout: { write: (s: string) => out.push(s) },
            stderr: { write: () => {} },
            readFileSync: (() => "") as any,
            getVersion: () => "0.0.0",
        };

        handleMask(
            ["config.json", "--patterns", "password", "--to", "json"],
            io as any,
        );

        // The second argument to SafeAccess.from must be "object", not ""
        const fromCalls = sa.from.mock.calls as unknown[][];
        expect(fromCalls.length).toBeGreaterThan(0);
        expect(fromCalls[fromCalls.length - 1][1]).toBe("object");
    });
});
