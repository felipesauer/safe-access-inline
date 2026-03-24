import { describe, it, expect, beforeAll } from "vitest";
import { execSync } from "node:child_process";
import { resolve, join } from "node:path";

const CLI = resolve(__dirname, "../dist/cli.mjs");
const FIXTURES = resolve(__dirname, "./fixtures");

function run(args: string, input?: string): string {
    const cmd = `node ${CLI} ${args}`;
    return execSync(cmd, {
        encoding: "utf-8",
        cwd: resolve(__dirname, ".."),
        input,
        timeout: 10_000,
    }).trim();
}

function runWithExit(args: string): {
    stdout: string;
    stderr: string;
    code: number;
} {
    const cmd = `node ${CLI} ${args}`;
    try {
        const stdout = execSync(cmd, {
            encoding: "utf-8",
            cwd: resolve(__dirname, ".."),
            timeout: 10_000,
            stdio: ["pipe", "pipe", "pipe"],
        }).trim();
        return { stdout, stderr: "", code: 0 };
    } catch (err: unknown) {
        const e = err as { stdout?: string; stderr?: string; status?: number };
        return {
            stdout: (e.stdout ?? "").trim(),
            stderr: (e.stderr ?? "").trim(),
            code: e.status ?? 1,
        };
    }
}

const configJson = join(FIXTURES, "config.json");
const configYaml = join(FIXTURES, "config.yaml");
const configToml = join(FIXTURES, "config.toml");

beforeAll(() => {
    // Ensure CLI is built
    try {
        execSync("npm run build", {
            cwd: resolve(__dirname, ".."),
            stdio: ["pipe", "pipe", "pipe"],
            timeout: 30_000,
        });
    } catch (err: unknown) {
        const e = err as { stderr?: Buffer | string; stdout?: Buffer | string };
        const detail = String(e.stderr ?? e.stdout ?? "").trim();
        throw new Error(`CLI build failed${detail ? `:\n${detail}` : ""}`, {
            cause: err,
        });
    }
});

describe("CLI — help & version", () => {
    it("shows help with --help", () => {
        const out = run("--help");
        expect(out).toContain("safe-access");
        expect(out).toContain("Usage:");
    });

    it("shows help with -h", () => {
        const out = run("-h");
        expect(out).toContain("Usage:");
    });

    it("shows help with no args", () => {
        const out = run("");
        expect(out).toContain("Usage:");
    });

    it("shows version with --version", () => {
        const out = run("--version");
        expect(out).toMatch(/^\d+\.\d+\.\d+$/);
    });

    it("shows version with -v", () => {
        const out = run("-v");
        expect(out).toMatch(/^\d+\.\d+\.\d+$/);
    });
});

describe("CLI — get", () => {
    it("gets a nested value from JSON", () => {
        expect(run(`get ${configJson} "database.host"`)).toBe("localhost");
    });

    it("gets a nested value from YAML", () => {
        expect(run(`get ${configYaml} "app.name"`)).toBe("test-app");
    });

    it("gets a nested value from TOML", () => {
        expect(run(`get ${configToml} "database.port"`)).toBe("5432");
    });

    it("returns default for missing path", () => {
        expect(run(`get ${configJson} "missing.path" --default fallback`)).toBe(
            "fallback",
        );
    });

    it("returns null for missing path without default", () => {
        expect(run(`get ${configJson} "missing.path"`)).toBe("null");
    });

    it("supports wildcard", () => {
        const out = run(`get ${configJson} "database.*"`);
        const parsed = JSON.parse(out);
        expect(parsed).toContain("localhost");
        expect(parsed).toContain(5432);
    });

    it("shows usage error without enough args", () => {
        const { stderr, code } = runWithExit(`get ${configJson}`);
        expect(code).toBe(1);
        expect(stderr).toContain("Usage:");
    });
});

describe("CLI — set", () => {
    it("sets a value and outputs JSON", () => {
        const out = run(`set ${configJson} "database.port" 3306 --pretty`);
        const parsed = JSON.parse(out);
        expect(parsed.database.port).toBe(3306);
    });

    it("sets a string value", () => {
        const out = run(`set ${configJson} "database.host" '"newhost"'`);
        const parsed = JSON.parse(out);
        expect(parsed.database.host).toBe("newhost");
    });
});

describe("CLI — remove", () => {
    it("removes a path and outputs JSON", () => {
        const out = run(`remove ${configJson} "database.port" --pretty`);
        const parsed = JSON.parse(out);
        expect(parsed.database.port).toBeUndefined();
        expect(parsed.database.host).toBe("localhost");
    });
});

describe("CLI — keys", () => {
    it("lists root keys", () => {
        const out = run(`keys ${configJson}`);
        expect(out).toContain("app");
        expect(out).toContain("database");
    });

    it("lists keys at path", () => {
        const out = run(`keys ${configJson} "database"`);
        expect(out).toContain("host");
        expect(out).toContain("port");
    });
});

describe("CLI — type", () => {
    it("returns type of object", () => {
        expect(run(`type ${configJson} "database"`)).toBe("object");
    });

    it("returns type of string", () => {
        expect(run(`type ${configJson} "database.host"`)).toBe("string");
    });

    it("returns type of number", () => {
        expect(run(`type ${configJson} "database.port"`)).toBe("number");
    });

    it("returns null for missing path", () => {
        expect(run(`type ${configJson} "missing"`)).toBe("null");
    });
});

describe("CLI — has", () => {
    it("exits 0 when path exists", () => {
        const { stdout, code } = runWithExit(
            `has ${configJson} "database.host"`,
        );
        expect(stdout).toBe("true");
        expect(code).toBe(0);
    });

    it("exits 1 when path missing", () => {
        const { stdout, code } = runWithExit(
            `has ${configJson} "missing.path"`,
        );
        expect(stdout).toBe("false");
        expect(code).toBe(1);
    });
});

describe("CLI — count", () => {
    it("counts root keys", () => {
        expect(run(`count ${configJson}`)).toBe("2");
    });

    it("counts keys at path", () => {
        expect(run(`count ${configJson} "database"`)).toBe("2");
    });
});

describe("CLI — stdin", () => {
    it("reads from stdin with -", () => {
        const input = '{"name": "test", "age": 30}';
        const out = run('get - "name"', input);
        expect(out).toBe("test");
    });
});

describe("CLI — error handling", () => {
    it("reports unknown command", () => {
        const { stderr, code } = runWithExit("foobar");
        expect(code).toBe(1);
        expect(stderr).toContain("Unknown command");
    });

    it("reports missing file", () => {
        const { stderr, code } = runWithExit(
            'get /nonexistent/file.json "key"',
        );
        expect(code).toBe(1);
        expect(stderr).toContain("Error:");
    });
});
