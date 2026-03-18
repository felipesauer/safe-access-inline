import { describe, it, expect, vi, afterEach } from "vitest";
import { readFileSync } from "node:fs";
import { resolve, join } from "node:path";
import {
    run,
    HELP,
    defaultGetVersion,
    formatOutput,
    printValue,
    parseMaskPatterns,
    parseJsonValue,
    loadFromStdinOrFile,
    type CliIO,
} from "../src/cli.js";
import {
    SafeAccess,
    PluginRegistry,
} from "@safe-access-inline/safe-access-inline";

const FIXTURES = resolve(__dirname, "../../js/tests/fixtures");
const configJson = join(FIXTURES, "config.json");
const configYaml = join(FIXTURES, "config.yaml");
const configToml = join(FIXTURES, "config.toml");
const overrideJson = join(FIXTURES, "override.json");
const configSchema = join(FIXTURES, "config.schema.json");
const configFailSchema = join(FIXTURES, "config-fail.schema.json");

function createIO(): CliIO & { stdoutData: string; stderrData: string } {
    const io = {
        stdoutData: "",
        stderrData: "",
        stdout: {
            write(s: string) {
                io.stdoutData += s;
            },
        },
        stderr: {
            write(s: string) {
                io.stderrData += s;
            },
        },
        readFileSync,
        getVersion: () => "1.2.3",
    };
    return io;
}

function runCli(args: string[]): {
    stdout: string;
    stderr: string;
    exitCode: number;
} {
    const io = createIO();
    const code = run(args, io);
    return {
        stdout: io.stdoutData.trim(),
        stderr: io.stderrData.trim(),
        exitCode: code,
    };
}

// ── Helper functions ──

describe("defaultGetVersion", () => {
    afterEach(() => {
        vi.restoreAllMocks();
    });

    it("returns a version string", () => {
        const version = defaultGetVersion();
        expect(version).toMatch(/^\d+\.\d+\.\d+$/);
    });

    it("returns '0.0.0' when package.json cannot be read", async () => {
        // Clear module cache and re-import with mocked fs to trigger the catch branch
        vi.resetModules();
        vi.doMock("node:fs", async (importOriginal) => {
            const original = await importOriginal<typeof import("node:fs")>();
            return {
                ...original,
                readFileSync: (...args: Parameters<typeof readFileSync>) => {
                    const pathArg = String(args[0]);
                    if (pathArg.includes("package.json")) {
                        throw new Error("mocked fs failure");
                    }
                    return original.readFileSync(...args);
                },
            };
        });
        const { defaultGetVersion: freshGetVersion } =
            await import("../src/cli.js");
        expect(freshGetVersion()).toBe("0.0.0");
        vi.doUnmock("node:fs");
    });
});

describe("parseMaskPatterns", () => {
    it("splits comma-separated patterns", () => {
        expect(parseMaskPatterns("password,secret,api_*")).toEqual([
            "password",
            "secret",
            "api_*",
        ]);
    });

    it("trims whitespace", () => {
        expect(parseMaskPatterns("  a , b , c  ")).toEqual(["a", "b", "c"]);
    });
});

describe("parseJsonValue", () => {
    it("parses valid JSON", () => {
        expect(parseJsonValue("42")).toBe(42);
        expect(parseJsonValue('"hello"')).toBe("hello");
        expect(parseJsonValue("true")).toBe(true);
        expect(parseJsonValue("[1,2]")).toEqual([1, 2]);
    });

    it("returns raw string for invalid JSON", () => {
        expect(parseJsonValue("not-json")).toBe("not-json");
    });
});

describe("printValue", () => {
    it("prints null for null", () => {
        const io = createIO();
        printValue(null, io.stdout);
        expect(io.stdoutData).toBe("null\n");
    });

    it("prints null for undefined", () => {
        const io = createIO();
        printValue(undefined, io.stdout);
        expect(io.stdoutData).toBe("null\n");
    });

    it("prints string directly", () => {
        const io = createIO();
        printValue("hello", io.stdout);
        expect(io.stdoutData).toBe("hello\n");
    });

    it("prints object as JSON", () => {
        const io = createIO();
        printValue({ a: 1 }, io.stdout);
        expect(JSON.parse(io.stdoutData)).toEqual({ a: 1 });
    });

    it("prints number as JSON", () => {
        const io = createIO();
        printValue(42, io.stdout);
        expect(io.stdoutData.trim()).toBe("42");
    });
});

describe("formatOutput", () => {
    it("formats as JSON", () => {
        const accessor = SafeAccess.from({ a: 1 }, "object");
        const out = formatOutput(accessor, "json", false);
        expect(JSON.parse(out)).toEqual({ a: 1 });
    });

    it("formats as pretty JSON", () => {
        const accessor = SafeAccess.from({ a: 1 }, "object");
        const out = formatOutput(accessor, "json", true);
        expect(out).toContain("\n");
        expect(JSON.parse(out)).toEqual({ a: 1 });
    });

    it("formats as YAML", () => {
        const accessor = SafeAccess.from({ a: 1 }, "object");
        const out = formatOutput(accessor, "yaml");
        expect(out).toContain("a: 1");
    });

    it("formats as TOML", () => {
        const accessor = SafeAccess.from(
            { section: { key: "value" } },
            "object",
        );
        const out = formatOutput(accessor, "toml");
        expect(out).toContain("[section]");
    });

    it("formats as XML", () => {
        PluginRegistry.registerSerializer("xml", {
            serialize: (data) => `<root>${JSON.stringify(data)}</root>`,
        });
        const accessor = SafeAccess.from({ item: { key: "value" } }, "object");
        const out = formatOutput(accessor, "xml");
        expect(out).toContain("<root>");
    });

    it("uses transform for unknown formats", () => {
        PluginRegistry.registerSerializer("custom", {
            serialize: (data) => `CUSTOM:${JSON.stringify(data)}`,
        });
        const accessor = SafeAccess.from({ a: 1 }, "object");
        const out = formatOutput(accessor, "custom");
        expect(out).toBe('CUSTOM:{"a":1}');
    });

    it("defaults to pretty JSON when no format given", () => {
        const accessor = SafeAccess.from({ a: 1 }, "object");
        const out = formatOutput(accessor);
        expect(out).toContain("\n");
        expect(JSON.parse(out)).toEqual({ a: 1 });
    });
});

describe("loadFromStdinOrFile", () => {
    it("loads JSON file", () => {
        const accessor = loadFromStdinOrFile(configJson);
        expect(accessor.get("app.name")).toBe("test-app");
    });

    it("loads with explicit format", () => {
        const accessor = loadFromStdinOrFile(configJson, "json");
        expect(accessor.get("database.host")).toBe("localhost");
    });

    it("reads from stdin (-) with detect", () => {
        const fakeRead = (() => '{"x": 1}') as unknown as typeof readFileSync;
        const accessor = loadFromStdinOrFile("-", undefined, fakeRead);
        expect(accessor.get("x")).toBe(1);
    });

    it("reads from stdin (-) with explicit format", () => {
        const fakeRead = (() => '{"x": 1}') as unknown as typeof readFileSync;
        const accessor = loadFromStdinOrFile("-", "json", fakeRead);
        expect(accessor.get("x")).toBe(1);
    });
});

// ── run() — help & version ──

describe("run — help & version", () => {
    it("shows help with no args", () => {
        const { stdout } = runCli([]);
        expect(stdout).toContain("Usage:");
        expect(stdout).toBe(HELP);
    });

    it("shows help with --help", () => {
        const { stdout } = runCli(["--help"]);
        expect(stdout).toBe(HELP);
    });

    it("shows help with -h", () => {
        const { stdout } = runCli(["-h"]);
        expect(stdout).toBe(HELP);
    });

    it("shows version with --version", () => {
        const { stdout } = runCli(["--version"]);
        expect(stdout).toBe("1.2.3");
    });

    it("shows version with -v", () => {
        const { stdout } = runCli(["-v"]);
        expect(stdout).toBe("1.2.3");
    });
});

// ── run() — get ──

describe("run — get", () => {
    it("gets a nested value from JSON", () => {
        const { stdout } = runCli(["get", configJson, "database.host"]);
        expect(stdout).toBe("localhost");
    });

    it("gets from YAML", () => {
        const { stdout } = runCli(["get", configYaml, "app.name"]);
        expect(stdout).toBe("test-app");
    });

    it("gets from TOML", () => {
        const { stdout } = runCli(["get", configToml, "database.port"]);
        expect(stdout).toBe("5432");
    });

    it("returns default for missing path", () => {
        const { stdout } = runCli([
            "get",
            configJson,
            "missing.path",
            "--default",
            "fallback",
        ]);
        expect(stdout).toBe("fallback");
    });

    it("returns null for missing path without default", () => {
        const { stdout } = runCli(["get", configJson, "missing.path"]);
        expect(stdout).toBe("null");
    });

    it("supports wildcard", () => {
        const { stdout } = runCli(["get", configJson, "database.*"]);
        const parsed = JSON.parse(stdout);
        expect(parsed).toContain("localhost");
        expect(parsed).toContain(5432);
    });

    it("shows usage error without enough args", () => {
        const { stderr, exitCode } = runCli(["get", configJson]);
        expect(exitCode).toBe(1);
        expect(stderr).toContain("Usage:");
    });
});

// ── run() — set ──

describe("run — set", () => {
    it("sets a value and outputs JSON", () => {
        const { stdout } = runCli([
            "set",
            configJson,
            "database.port",
            "3306",
            "--to",
            "json",
            "--pretty",
        ]);
        const parsed = JSON.parse(stdout);
        expect(parsed.database.port).toBe(3306);
    });

    it("sets a string value", () => {
        const { stdout } = runCli([
            "set",
            configJson,
            "database.host",
            '"newhost"',
            "--to",
            "json",
        ]);
        const parsed = JSON.parse(stdout);
        expect(parsed.database.host).toBe("newhost");
    });

    it("shows usage error without enough args", () => {
        const { stderr, exitCode } = runCli(["set", configJson, "path"]);
        expect(exitCode).toBe(1);
        expect(stderr).toContain("Usage:");
    });
});

// ── run() — remove ──

describe("run — remove", () => {
    it("removes a path and outputs JSON", () => {
        const { stdout } = runCli([
            "remove",
            configJson,
            "database.port",
            "--to",
            "json",
            "--pretty",
        ]);
        const parsed = JSON.parse(stdout);
        expect(parsed.database.port).toBeUndefined();
        expect(parsed.database.host).toBe("localhost");
    });

    it("shows usage error without enough args", () => {
        const { stderr, exitCode } = runCli(["remove", configJson]);
        expect(exitCode).toBe(1);
        expect(stderr).toContain("Usage:");
    });
});

// ── run() — transform / convert ──

describe("run — transform", () => {
    it("transforms YAML to JSON", () => {
        const { stdout } = runCli([
            "transform",
            configYaml,
            "--to",
            "json",
            "--pretty",
        ]);
        const parsed = JSON.parse(stdout);
        expect(parsed.app.name).toBe("test-app");
    });

    it("transforms JSON to YAML", () => {
        const { stdout } = runCli(["transform", configJson, "--to", "yaml"]);
        expect(stdout).toContain("app:");
        expect(stdout).toContain("name: test-app");
    });

    it("transforms JSON to TOML", () => {
        const { stdout } = runCli(["transform", configJson, "--to", "toml"]);
        expect(stdout).toContain("[app]");
        expect(stdout).toContain("[database]");
    });

    it("shows usage error without --to", () => {
        const { stderr, exitCode } = runCli(["transform", configJson]);
        expect(exitCode).toBe(1);
        expect(stderr).toContain("Usage:");
    });

    it("converts with --file flag", () => {
        const { stdout } = runCli([
            "convert",
            "--file",
            configYaml,
            "--to",
            "json",
            "--pretty",
        ]);
        const parsed = JSON.parse(stdout);
        expect(parsed.app.name).toBe("test-app");
    });

    it("converts with --from for stdin", () => {
        const io = createIO();
        io.readFileSync = (() => '{"x": 1}') as unknown as typeof readFileSync;
        run(["convert", "-", "--from", "json", "--to", "yaml"], io);
        expect(io.stdoutData).toContain("x: 1");
    });

    it("shows usage when no file and no --to", () => {
        const { stderr, exitCode } = runCli(["convert"]);
        expect(exitCode).toBe(1);
        expect(stderr).toContain("Usage:");
    });
});

// ── run() — diff ──

describe("run — diff", () => {
    it("diffs two JSON files", () => {
        const { stdout } = runCli(["diff", configJson, overrideJson]);
        const patches = JSON.parse(stdout);
        expect(Array.isArray(patches)).toBe(true);
        expect(patches.length).toBeGreaterThan(0);
        const ops = patches.map((p: { op: string }) => p.op);
        expect(ops).toContain("replace");
    });

    it("shows usage error without two files", () => {
        const { stderr, exitCode } = runCli(["diff", configJson]);
        expect(exitCode).toBe(1);
        expect(stderr).toContain("Usage:");
    });
});

// ── run() — mask ──

describe("run — mask", () => {
    it("masks sensitive keys", () => {
        const { stdout } = runCli([
            "mask",
            configJson,
            "--patterns",
            "host",
            "--pretty",
        ]);
        const parsed = JSON.parse(stdout);
        expect(parsed.database.host).toBe("[REDACTED]");
        expect(parsed.database.port).toBe(5432);
    });

    it("masks with wildcard pattern", () => {
        const { stdout } = runCli([
            "mask",
            configJson,
            "--patterns",
            "ho*",
            "--pretty",
        ]);
        const parsed = JSON.parse(stdout);
        expect(parsed.database.host).toBe("[REDACTED]");
    });

    it("outputs in specified format", () => {
        const { stdout } = runCli([
            "mask",
            configJson,
            "--patterns",
            "host",
            "--to",
            "yaml",
        ]);
        expect(stdout).toContain("[REDACTED]");
    });

    it("shows usage error without --patterns", () => {
        const { stderr, exitCode } = runCli(["mask", configJson]);
        expect(exitCode).toBe(1);
        expect(stderr).toContain("Usage:");
    });
});

// ── run() — layer ──

describe("run — layer", () => {
    it("layers two config files", () => {
        const { stdout } = runCli([
            "layer",
            configJson,
            overrideJson,
            "--pretty",
        ]);
        const parsed = JSON.parse(stdout);
        expect(parsed.app.name).toBe("override-app");
        expect(parsed.database.host).toBe("localhost");
    });

    it("layers YAML and JSON", () => {
        const { stdout } = runCli([
            "layer",
            configYaml,
            overrideJson,
            "--pretty",
        ]);
        const parsed = JSON.parse(stdout);
        expect(parsed.app.name).toBe("override-app");
    });

    it("outputs in specified format", () => {
        const { stdout } = runCli([
            "layer",
            configJson,
            overrideJson,
            "--to",
            "yaml",
        ]);
        expect(stdout).toContain("app:");
    });

    it("shows usage error without files", () => {
        const { stderr, exitCode } = runCli(["layer"]);
        expect(exitCode).toBe(1);
        expect(stderr).toContain("Usage:");
    });
});

// ── run() — keys ──

describe("run — keys", () => {
    it("lists root keys", () => {
        const { stdout } = runCli(["keys", configJson]);
        expect(stdout).toContain("app");
        expect(stdout).toContain("database");
    });

    it("lists keys at path", () => {
        const { stdout } = runCli(["keys", configJson, "database"]);
        expect(stdout).toContain("host");
        expect(stdout).toContain("port");
    });

    it("shows usage error without file", () => {
        const { stderr, exitCode } = runCli(["keys"]);
        expect(exitCode).toBe(1);
        expect(stderr).toContain("Usage:");
    });
});

// ── run() — type ──

describe("run — type", () => {
    it("returns type of object", () => {
        const { stdout } = runCli(["type", configJson, "database"]);
        expect(stdout).toBe("object");
    });

    it("returns type of string", () => {
        const { stdout } = runCli(["type", configJson, "database.host"]);
        expect(stdout).toBe("string");
    });

    it("returns type of number", () => {
        const { stdout } = runCli(["type", configJson, "database.port"]);
        expect(stdout).toBe("number");
    });

    it("returns null for missing path", () => {
        const { stdout } = runCli(["type", configJson, "missing"]);
        expect(stdout).toBe("null");
    });

    it("shows usage error without path", () => {
        const { stderr, exitCode } = runCli(["type", configJson]);
        expect(exitCode).toBe(1);
        expect(stderr).toContain("Usage:");
    });
});

// ── run() — has ──

describe("run — has", () => {
    it("exits 0 when path exists", () => {
        const { stdout, exitCode } = runCli([
            "has",
            configJson,
            "database.host",
        ]);
        expect(stdout).toBe("true");
        // has always calls exit — 0 for exists, 1 for missing
        expect(exitCode).toBe(0);
    });

    it("exits 1 when path missing", () => {
        const { stdout, exitCode } = runCli([
            "has",
            configJson,
            "missing.path",
        ]);
        expect(stdout).toBe("false");
        expect(exitCode).toBe(1);
    });

    it("shows usage error without path", () => {
        const { stderr, exitCode } = runCli(["has", configJson]);
        expect(exitCode).toBe(1);
        expect(stderr).toContain("Usage:");
    });
});

// ── run() — count ──

describe("run — count", () => {
    it("counts root keys", () => {
        const { stdout } = runCli(["count", configJson]);
        expect(stdout).toBe("2");
    });

    it("counts keys at path", () => {
        const { stdout } = runCli(["count", configJson, "database"]);
        expect(stdout).toBe("2");
    });

    it("shows usage error without file", () => {
        const { stderr, exitCode } = runCli(["count"]);
        expect(exitCode).toBe(1);
        expect(stderr).toContain("Usage:");
    });
});

// ── run() — validate ──

describe("run — validate", () => {
    it("validates valid data with text output", () => {
        const { stdout, exitCode } = runCli([
            "validate",
            configJson,
            "--schema",
            configSchema,
        ]);
        expect(stdout).toBe("valid");
        // validate always calls exit — 0 for valid, 1 for invalid
        expect(exitCode).toBe(0);
    });

    it("validates valid data with json output", () => {
        const { stdout, exitCode } = runCli([
            "validate",
            configJson,
            "--schema",
            configSchema,
            "--format",
            "json",
        ]);
        expect(exitCode).toBe(0);
        const result = JSON.parse(stdout);
        expect(result.valid).toBe(true);
        expect(result.errors).toEqual([]);
    });

    it("reports errors with text output", () => {
        const { stderr, exitCode } = runCli([
            "validate",
            configJson,
            "--schema",
            configFailSchema,
        ]);
        expect(exitCode).toBe(1);
        expect(stderr).toContain("missing_field");
    });

    it("reports errors with json output", () => {
        const { stdout, exitCode } = runCli([
            "validate",
            configJson,
            "--schema",
            configFailSchema,
            "--format",
            "json",
        ]);
        expect(exitCode).toBe(1);
        const result = JSON.parse(stdout);
        expect(result.valid).toBe(false);
        expect(result.errors.length).toBeGreaterThan(0);
    });

    it("shows usage when no schema provided", () => {
        const { stderr, exitCode } = runCli(["validate", configJson]);
        expect(exitCode).toBe(1);
        expect(stderr).toContain("Usage:");
    });
});

// ── run() — error handling ──

describe("run — error handling", () => {
    it("reports unknown command", () => {
        const { stderr, exitCode } = runCli(["foobar"]);
        expect(exitCode).toBe(1);
        expect(stderr).toContain("Unknown command");
    });

    it("reports missing file", () => {
        const { stderr, exitCode } = runCli([
            "get",
            "/nonexistent/file.json",
            "key",
        ]);
        expect(exitCode).toBe(1);
        expect(stderr).toContain("Error:");
    });

    it("prints stack trace when DEBUG=1 and error occurs", () => {
        const orig = process.env.DEBUG;
        process.env.DEBUG = "1";
        try {
            const { stderr, exitCode } = runCli([
                "get",
                "/nonexistent/file.json",
                "key",
            ]);
            expect(exitCode).toBe(1);
            expect(stderr).toContain("Error:");
            expect(stderr).toMatch(/at\s/); // stack trace contains "at " frames
        } finally {
            if (orig === undefined) {
                delete process.env.DEBUG;
            } else {
                process.env.DEBUG = orig;
            }
        }
    });

    it("does not print stack trace when DEBUG is not set", () => {
        const orig = process.env.DEBUG;
        delete process.env.DEBUG;
        try {
            const { stderr } = runCli(["get", "/nonexistent/file.json", "key"]);
            // stderr should have "Error:" but not a full stack trace
            expect(stderr).toContain("Error:");
            expect(stderr).not.toMatch(/^\s+at\s/m);
        } finally {
            if (orig !== undefined) {
                process.env.DEBUG = orig;
            }
        }
    });
});
