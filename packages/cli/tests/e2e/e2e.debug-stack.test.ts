import { describe, it, expect, vi, afterEach } from "vitest";
import { readFileSync } from "node:fs";
import * as getHandler from "../../src/handlers/get.handler.js";

// vi.mock is hoisted — cli.ts receives the mocked handler on first import
vi.mock("../../src/handlers/get.handler.js");

describe("e2e debug stack", () => {
    afterEach(() => {
        vi.restoreAllMocks();
        vi.resetAllMocks();
        vi.unstubAllEnvs();
    });

    it("prints stack trace when DEBUG=1 and handler throws Error", async () => {
        vi.stubEnv("DEBUG", "1");

        vi.mocked(getHandler.handleGet).mockImplementation(() => {
            const e = new Error("boom");
            e.stack = "my-stack-trace";
            throw e;
        });

        const cliMod = await import("../../src/cli.js");

        const out: string[] = [];
        const err: string[] = [];
        const io = {
            stdout: { write: (s: string) => out.push(s) },
            stderr: { write: (s: string) => err.push(s) },
            readFileSync: (() => "") as unknown as typeof readFileSync,
            getVersion: () => "0.0.0",
        } as const;

        const code = cliMod.run(["get", "p"], io);
        expect(code).toBe(1);
        const stderr = err.join("");
        expect(stderr).toContain("Error: boom");
        expect(stderr).toContain("my-stack-trace");
    });

    it("does not print stack trace when DEBUG is not set", async () => {
        vi.stubEnv("DEBUG", "");

        vi.mocked(getHandler.handleGet).mockImplementation(() => {
            const e = new Error("hidden-stack");
            e.stack = "should-not-appear";
            throw e;
        });

        const cliMod = await import("../../src/cli.js");

        const err: string[] = [];
        const io = {
            stdout: { write: () => {} },
            stderr: { write: (s: string) => err.push(s) },
            readFileSync: (() => "") as unknown as typeof readFileSync,
            getVersion: () => "0.0.0",
        } as const;

        const code = cliMod.run(["get", "p"], io);
        expect(code).toBe(1);
        const stderr = err.join("");
        expect(stderr).toContain("Error: hidden-stack");
        expect(stderr).not.toContain("should-not-appear");
    });
});
