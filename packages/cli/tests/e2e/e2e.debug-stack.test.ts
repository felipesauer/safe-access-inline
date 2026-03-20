import { describe, it, expect, vi, afterEach } from "vitest";

describe("e2e debug stack", () => {
    afterEach(() => {
        vi.restoreAllMocks();
        vi.resetAllMocks();
        vi.unstubAllEnvs();
    });

    it("prints stack trace when DEBUG=1 and handler throws Error", async () => {
        vi.stubEnv("DEBUG", "1");

        const handlers = await import("../../src/handlers/get.handler");
        vi.spyOn(handlers as any, "handleGet").mockImplementation(() => {
            const e = new Error("boom");
            e.stack = "my-stack-trace";
            throw e;
        });

        const cliMod = await import("../../src/cli");

        const out: string[] = [];
        const err: string[] = [];
        const io = {
            stdout: { write: (s: string) => out.push(s) },
            stderr: { write: (s: string) => err.push(s) },
            readFileSync: (() => "") as any,
            getVersion: () => "0.0.0",
        } as const;

        const code = cliMod.run(["get", "p"], io);
        expect(code).toBe(1);
        const stderr = err.join("");
        expect(stderr).toContain("Error: boom");
        expect(stderr).toContain("my-stack-trace");
    });
});
