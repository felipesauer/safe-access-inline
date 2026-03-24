import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { readFileSync } from "node:fs";
import * as saLib from "@safe-access-inline/safe-access-inline";

// Mock SafeAccess before importing the command-handlers so bindings are mocked
vi.mock("@safe-access-inline/safe-access-inline", () => ({
    SafeAccess: {
        from: vi.fn(),
        detect: vi.fn(),
    },
}));

import { loadFromStdinOrFile } from "../../src/command-handlers";
import * as ch from "../../src/command-handlers";

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

    it("loadFromStdinOrFile with file path calls detect when fromFormat omitted", async () => {
        ch.loadFromStdinOrFile(
            "./somefile.json",
            undefined,
            (() => '{"ok":true}') as unknown as typeof readFileSync,
        );
        expect(vi.mocked(saLib.SafeAccess.detect)).toHaveBeenCalled();
    });

    it("loadFromStdinOrFile with explicit fromFormat uses from with format", async () => {
        ch.loadFromStdinOrFile(
            "./somefile.json",
            "json",
            (() => '{"ok":true}') as unknown as typeof readFileSync,
        );
        expect(vi.mocked(saLib.SafeAccess.from)).toHaveBeenCalled();
        const calls = vi.mocked(saLib.SafeAccess.from).mock.calls;
        const call = calls[calls.length - 1];
        expect(call[1]).toBe("json");
    });
});
