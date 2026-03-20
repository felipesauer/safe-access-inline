import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { readFileSync } from "node:fs";
import * as saLib from "@safe-access-inline/safe-access-inline";

// Mock SafeAccess before importing the command-handlers so bindings are mocked
vi.mock("@safe-access-inline/safe-access-inline", () => ({
    SafeAccess: {
        from: vi.fn(),
        detect: vi.fn(),
        fromFileSync: vi.fn(),
    },
    mask: vi.fn(),
}));

import { loadFromStdinOrFile } from "../../src/command-handlers";
import * as ch from "../../src/command-handlers";
import { handleMask } from "../../src/handlers/mask.handler";

describe(`${loadFromStdinOrFile.name} & utils`, () => {
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
        const readFileFn = vi.fn(() => '{"ok":true}');
        ch.loadFromStdinOrFile(
            "-",
            undefined,
            readFileFn as unknown as typeof readFileSync,
        );
        expect(vi.mocked(saLib.SafeAccess.detect)).toHaveBeenCalled();

        ch.loadFromStdinOrFile(
            "-",
            "json",
            readFileFn as unknown as typeof readFileSync,
        );
        expect(vi.mocked(saLib.SafeAccess.from)).toHaveBeenCalled();
    });

    it("loadFromStdinOrFile with file path calls fromFileSync WITHOUT format when fromFormat omitted", async () => {
        ch.loadFromStdinOrFile(
            "./somefile.json",
            undefined,
            (() => "") as unknown as typeof readFileSync,
        );
        expect(vi.mocked(saLib.SafeAccess.fromFileSync)).toHaveBeenCalled();
        // mata mutante ID 79: ConditionalExpression → true (sempre usaria fromFormat)
        // sem fromFormat, o argumento options NÃO deve conter a propriedade 'format'
        const [, opts] = vi
            .mocked(saLib.SafeAccess.fromFileSync)
            .mock.calls.at(-1)!;
        expect(opts).not.toHaveProperty("format");
        expect(opts).toMatchObject({ allowAnyPath: true });
    });

    it("loadFromStdinOrFile with explicit fromFormat uses format option", async () => {
        ch.loadFromStdinOrFile(
            "./somefile.json",
            "json",
            (() => "") as unknown as typeof readFileSync,
        );
        expect(vi.mocked(saLib.SafeAccess.fromFileSync)).toHaveBeenCalled();
        const calls = vi.mocked(saLib.SafeAccess.fromFileSync).mock.calls;
        const call = calls[calls.length - 1];
        expect(call[1]).toMatchObject({ format: "json" });
    });

    // ID 227 — mask handler calls SafeAccess.from with "object" as format after masking
    it("mask handler calls SafeAccess.from with 'object' as format", async () => {
        // fromFileSync must return a fake accessor with toObject()
        vi.mocked(saLib.SafeAccess.fromFileSync).mockReturnValueOnce({
            toObject: () => ({ password: "secret" }),
        } as unknown as ReturnType<typeof saLib.SafeAccess.fromFileSync>);
        // from must return a fake masked accessor with toJson() so formatOutput can proceed
        vi.mocked(saLib.SafeAccess.from).mockReturnValueOnce({
            toJson: () => '{"password":"[REDACTED]"}',
        } as unknown as ReturnType<typeof saLib.SafeAccess.from>);

        const out: string[] = [];
        const io = {
            stdout: { write: (s: string) => out.push(s) },
            stderr: { write: () => {} },
            readFileSync: (() => "") as unknown as typeof readFileSync,
            getVersion: () => "0.0.0",
        };

        handleMask(
            ["config.json", "--patterns", "password", "--to", "json"],
            io,
        );

        // The second argument to SafeAccess.from must be "object", not ""
        const fromCalls = vi.mocked(saLib.SafeAccess.from).mock.calls;
        expect(fromCalls.length).toBeGreaterThan(0);
        expect(fromCalls[fromCalls.length - 1][1]).toBe("object");
    });
});
