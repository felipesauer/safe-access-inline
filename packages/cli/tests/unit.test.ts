import { describe, it, expect, vi, afterEach } from "vitest";
import { readFileSync } from "node:fs";
import { resolve, join } from "node:path";
import {
    run,
    HELP,
    defaultGetVersion,
    printValue,
    parseJsonValue,
    loadFromStdinOrFile,
    strOpt,
    boolOpt,
    type CliIO,
} from "../src/cli.js";
import { SafeAccess } from "@safe-access-inline/safe-access-inline";

const FIXTURES = resolve(__dirname, "./fixtures");
const configJson = join(FIXTURES, "config.json");
const configYaml = join(FIXTURES, "config.yaml");
const configToml = join(FIXTURES, "config.toml");
const asymmetricJson = join(FIXTURES, "config-asymmetric.json");

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

describe(defaultGetVersion.name, () => {
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

describe(parseJsonValue.name, () => {
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

describe(printValue.name, () => {
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

describe(loadFromStdinOrFile.name, () => {
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

describe(`${run.name} — help & version`, () => {
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

    // ID 21 — trailing \n on help output
    it("help output ends with newline", () => {
        const io = createIO();
        run([], io);
        expect(io.stdoutData).toMatch(/\n$/);
    });

    // ID 28 — trailing \n on version output
    it("version output ends with newline", () => {
        const io = createIO();
        run(["--version"], io);
        expect(io.stdoutData).toBe("1.2.3\n");
    });
});

describe(`${run.name} — get`, () => {
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
        // garante que é null JS, não a string "undefined" (mata mutante ID 162)
        expect(stdout).not.toBe("undefined");
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

    // ID 155 — strict: false allows unrecognized flags
    it("ignores unrecognized flags gracefully", () => {
        const io = createIO();
        const code = run(
            ["get", configJson, "database.host", "--unknown", "val"],
            io,
        );
        expect(code).toBe(0);
        expect(io.stdoutData.trim()).toBe("localhost");
    });
});

describe(`${run.name} — set`, () => {
    it("sets a value and outputs JSON", () => {
        const { stdout } = runCli([
            "set",
            configJson,
            "database.port",
            "3306",
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
        ]);
        const parsed = JSON.parse(stdout);
        expect(parsed.database.host).toBe("newhost");
    });

    it("shows usage error without enough args", () => {
        const { stderr, exitCode } = runCli(["set", configJson, "path"]);
        expect(exitCode).toBe(1);
        expect(stderr).toContain("Usage:");
    });

    // ID 253 — pretty default is false (output is compact JSON without --pretty)
    it("outputs compact JSON by default without --pretty", () => {
        const io = createIO();
        run(["set", configJson, "database.port", "9999"], io);
        const output = io.stdoutData.trim();
        expect(() => JSON.parse(output)).not.toThrow();
        expect(output.split("\n")).toHaveLength(1);
    });

    // ID 255 — strict: false allows unrecognized flags
    it("ignores unrecognized flags gracefully", () => {
        const io = createIO();
        const code = run(
            ["set", configJson, "database.port", "9999", "--unknown", "val"],
            io,
        );
        expect(code).toBe(0);
    });

    // ID 262 — trailing \n on set output
    it("output ends with newline character", () => {
        const io = createIO();
        run(["set", configJson, "database.port", "9999"], io);
        expect(io.stdoutData).toMatch(/\n$/);
    });
});

describe(`${run.name} — remove`, () => {
    it("removes a path and outputs JSON", () => {
        const { stdout } = runCli([
            "remove",
            configJson,
            "database.port",
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

    // ID 236 — pretty default is false (output is compact JSON without --pretty)
    it("outputs compact JSON by default without --pretty", () => {
        const io = createIO();
        run(["remove", configJson, "database.port"], io);
        const output = io.stdoutData.trim();
        expect(() => JSON.parse(output)).not.toThrow();
        expect(output.split("\n")).toHaveLength(1);
    });

    // ID 238 — strict: false allows unrecognized flags
    it("ignores unrecognized flags gracefully", () => {
        const io = createIO();
        const code = run(
            ["remove", configJson, "database.port", "--unknown", "val"],
            io,
        );
        expect(code).toBe(0);
    });

    // ID 245 — trailing \n on remove output
    it("output ends with newline character", () => {
        const io = createIO();
        run(["remove", configJson, "database.port"], io);
        expect(io.stdoutData).toMatch(/\n$/);
    });
});

describe(`${run.name} — keys`, () => {
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

    it("lists keys at path with result distinct from root keys", () => {
        // raiz = ['a','b','c'] (3 keys) vs path='c' → ['x'] (1 key)
        // qualquer mutação na condição ternária produz resultado errado (mata ID 181)
        const io = createIO();
        run(["keys", asymmetricJson, "c"], io);
        expect(io.stdoutData.split("\n").filter(Boolean)).toEqual(["x"]);
    });

    it("keys output ends with newline when no path is given", () => {
        // verifica sem .trim() para matar IDs 185 e 186
        const io = createIO();
        run(["keys", asymmetricJson], io);
        expect(io.stdoutData).toMatch(/\n$/);
        expect(io.stdoutData.split("\n").filter(Boolean)).toEqual([
            "a",
            "b",
            "c",
        ]);
    });

    it("shows usage error without file", () => {
        const { stderr, exitCode } = runCli(["keys"]);
        expect(exitCode).toBe(1);
        expect(stderr).toContain("Usage:");
    });
});

describe(`${run.name} — type`, () => {
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

    // ID 304 — trailing \n on type output
    it("output ends with newline character", () => {
        const io = createIO();
        run(["type", configJson, "database"], io);
        expect(io.stdoutData).toBe("object\n");
    });
});

describe(`${run.name} — has`, () => {
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

describe(`${run.name} — count`, () => {
    it("counts root keys", () => {
        const { stdout } = runCli(["count", configJson]);
        expect(stdout).toBe("2");
    });

    it("counts keys at path", () => {
        const { stdout } = runCli(["count", configJson, "database"]);
        expect(stdout).toBe("2");
    });

    it("counts keys at path with result distinct from root count", () => {
        // fixture assimétrica: raiz=3 chaves, 'c'=1 chave
        // se a condição ternária for mutada para true/false, o resultado muda (mata IDs 135–138)
        const io = createIO();
        run(["count", asymmetricJson, "c"], io);
        expect(io.stdoutData.trim()).toBe("1");
    });

    it("counts root keys on asymmetric fixture", () => {
        // raiz=3, diferente do path='c'=1, tornando as condições distinguíveis
        const io = createIO();
        run(["count", asymmetricJson], io);
        expect(io.stdoutData.trim()).toBe("3");
    });

    it("count output ends with newline character", () => {
        // verifica sem .trim() para matar ID 139
        const io = createIO();
        run(["count", configJson], io);
        expect(io.stdoutData).toMatch(/\d+\n$/);
    });

    it("shows usage error without file", () => {
        const { stderr, exitCode } = runCli(["count"]);
        expect(exitCode).toBe(1);
        expect(stderr).toContain("Usage:");
    });
});

describe(`${run.name} — error handling`, () => {
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

describe(strOpt.name, () => {
    it("returns the string when value is a string", () => {
        expect(strOpt("hello")).toBe("hello");
    });

    it("returns undefined when value is boolean true", () => {
        expect(strOpt(true)).toBeUndefined();
    });

    it("returns undefined when value is boolean false", () => {
        expect(strOpt(false)).toBeUndefined();
    });

    it("returns undefined when value is undefined", () => {
        expect(strOpt(undefined)).toBeUndefined();
    });

    it("returns empty string when value is empty string", () => {
        expect(strOpt("")).toBe("");
    });
});

describe(boolOpt.name, () => {
    it("returns true when value is boolean true", () => {
        expect(boolOpt(true)).toBe(true);
    });

    it("returns false when value is boolean false", () => {
        expect(boolOpt(false)).toBe(false);
    });

    it("returns false when value is undefined", () => {
        expect(boolOpt(undefined)).toBe(false);
    });

    it("returns false when value is a string", () => {
        expect(boolOpt("true")).toBe(false);
    });
});

describe(`${run.name} — stdin chains`, () => {
    it("set reads from stdin (-) and outputs modified JSON", () => {
        const io = createIO();
        io.readFileSync = ((fd: unknown, enc: unknown) => {
            if (fd === 0) return '{"user":{"name":"Alice"}}';
            return readFileSync(fd as string, enc as BufferEncoding);
        }) as unknown as typeof readFileSync;
        const code = run(["set", "-", "user.name", '"Bob"'], io);
        expect(code).toBe(0);
        const parsed = JSON.parse(io.stdoutData.trim());
        expect(parsed.user.name).toBe("Bob");
    });

    it("get reads from stdin (-) with auto-detect", () => {
        const io = createIO();
        io.readFileSync = (() => '{"x":42}') as unknown as typeof readFileSync;
        const code = run(["get", "-", "x"], io);
        expect(code).toBe(0);
        expect(io.stdoutData.trim()).toBe("42");
    });
});
