import { describe, it, expect, vi, afterEach } from "vitest";
import * as fs from "node:fs";
import { run } from "../../src/cli";

describe(`${run.name} — branches`, () => {
    afterEach(() => {
        vi.restoreAllMocks();
        vi.resetAllMocks();
    });

    it("prints help when no args", async () => {
        const cliMod = await import("../../src/cli");
        const out: string[] = [];
        const err: string[] = [];
        const io = {
            stdout: { write: (s: string) => out.push(s) },
            stderr: { write: (s: string) => err.push(s) },
            readFileSync: (() => "") as unknown as typeof fs.readFileSync,
            getVersion: () => "1.2.3",
        } as const;

        const code = cliMod.run([], io);
        expect(code).toBe(0);
        expect(out.join("")).toContain("safe-access");
    });

    it("prints version when --version provided", async () => {
        const cliMod = await import("../../src/cli");
        const out: string[] = [];
        const io = {
            stdout: { write: (s: string) => out.push(s) },
            stderr: { write: () => {} },
            readFileSync: (() => "") as unknown as typeof fs.readFileSync,
            getVersion: () => "9.9.9",
        } as const;

        const code = cliMod.run(["--version"], io);
        expect(code).toBe(0);
        expect(out.join("").trim()).toBe("9.9.9");
    });

    it("returns 1 and prints unknown command for unrecognized command", async () => {
        const cliMod = await import("../../src/cli");
        const out: string[] = [];
        const err: string[] = [];
        const io = {
            stdout: { write: (s: string) => out.push(s) },
            stderr: { write: (s: string) => err.push(s) },
            readFileSync: (() => "") as unknown as typeof fs.readFileSync,
            getVersion: () => "x",
        } as const;

        const code = cliMod.run(["unknown-cmd"], io);
        expect(code).toBe(1);
        expect(err.join("")).toContain("Unknown command: unknown-cmd");
    });

    it("catches non-Error thrown by handler and writes message", async () => {
        // Spy the handler BEFORE importing the CLI module so the CLI binds the mocked implementation
        const handlers = await import("../../src/handlers/get.handler");
        vi.spyOn(
            handlers as unknown as { handleGet: typeof handlers.handleGet },
            "handleGet",
        ).mockImplementation(() => {
            throw "plain-string-error";
        });

        const cliMod = await import("../../src/cli");

        const out: string[] = [];
        const err: string[] = [];
        const io = {
            stdout: { write: (s: string) => out.push(s) },
            stderr: { write: (s: string) => err.push(s) },
            readFileSync: (() => "") as unknown as typeof fs.readFileSync,
            getVersion: () => "0.0.0",
        } as const;

        const code = cliMod.run(["get", "a"], io);
        expect(code).toBe(1);
        expect(err.join("")).toContain("Error: plain-string-error");
    });

    it("catch block writes Error: prefix and returns 1", async () => {
        // mata mutante ID 58: BlockStatement {} esvazia o bloco catch
        const getHandlerMod = await import("../../src/handlers/get.handler");
        vi.spyOn(
            getHandlerMod as unknown as {
                handleGet: typeof getHandlerMod.handleGet;
            },
            "handleGet",
        ).mockImplementation(() => {
            throw new Error("catch-block-test");
        });

        const cliMod = await import("../../src/cli");
        const err: string[] = [];
        const io = {
            stdout: { write: () => {} },
            stderr: { write: (s: string) => err.push(s) },
            readFileSync: (() => "") as unknown as typeof fs.readFileSync,
            getVersion: () => "0.0.0",
        } as const;

        const code = cliMod.run(["get", "file.json", "key"], io);
        expect(code).toBe(1);
        expect(err.join("")).toBe("Error: catch-block-test\n");
    });

    it("defaultGetVersion returns package.json version", async () => {
        const cliMod = await import("../../src/cli");
        const pkg = JSON.parse(
            fs.readFileSync(
                new URL("../../package.json", import.meta.url),
                "utf-8",
            ),
        );
        expect(cliMod.defaultGetVersion()).toBe(pkg.version ?? "0.0.0");
    });

    // ID 5 — defaultGetVersion returns "0.0.0" when pkg.version is undefined (not a read error)
    it("defaultGetVersion returns '0.0.0' when package.json has no version field (via fs mock)", async () => {
        vi.resetModules();
        vi.doMock("node:fs", async (importOriginal) => {
            const original = await importOriginal<typeof import("node:fs")>();
            return {
                ...original,
                readFileSync: (
                    ...args: Parameters<typeof original.readFileSync>
                ) => {
                    const pathStr = String(args[0]);
                    if (pathStr.includes("package.json")) {
                        return '{"name":"cli-no-version"}';
                    }
                    return original.readFileSync(...args);
                },
            };
        });
        const { defaultGetVersion: fn } = await import("../../src/cli.js");
        expect(fn()).toBe("0.0.0");
        vi.doUnmock("node:fs");
        vi.resetModules();
    });
});
