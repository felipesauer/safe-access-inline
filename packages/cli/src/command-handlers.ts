import { parseArgs } from "node:util";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import {
    SafeAccess,
    diff,
    mask,
    JsonSchemaAdapter,
    type AbstractAccessor,
    type MaskPattern,
} from "@safe-access-inline/safe-access-inline";

/**
 * Abstraction over standard I/O for testability.
 */
export interface CliIO {
    stdout: { write(s: string): void };
    stderr: { write(s: string): void };
    readFileSync: typeof readFileSync;
    getVersion: () => string;
}

/**
 * Loads data from stdin (when fileArg is "-") or from a file path.
 *
 * @param fileArg - File path or "-" for stdin.
 * @param fromFormat - Optional explicit input format.
 * @param readFileFn - File reader function (defaults to Node's readFileSync).
 * @returns A SafeAccess accessor over the loaded data.
 */
export function loadFromStdinOrFile(
    fileArg: string,
    fromFormat?: string,
    readFileFn: typeof readFileSync = readFileSync,
) {
    if (fileArg === "-") {
        const buf = readFileFn(0, "utf-8") as string;
        if (fromFormat) {
            return SafeAccess.from(buf, fromFormat);
        }
        return SafeAccess.detect(buf);
    }
    if (fromFormat) {
        // Use SafeAccess.fromFileSync so the IoLoader path-traversal and null-byte checks apply
        return SafeAccess.fromFileSync(resolve(fileArg), {
            format: fromFormat,
            allowAnyPath: true,
        });
    }
    return SafeAccess.fromFileSync(resolve(fileArg), { allowAnyPath: true });
}

/**
 * Formats accessor output in the specified format.
 *
 * @param accessor - Data accessor to serialize.
 * @param format - Target format (json, yaml, toml, xml, or custom).
 * @param pretty - Whether to pretty-print JSON.
 * @returns Formatted string output.
 */
export function formatOutput(
    accessor: AbstractAccessor,
    format?: string,
    pretty?: boolean,
): string {
    if (format) {
        switch (format) {
            case "json":
                return accessor.toJson(pretty ?? false);
            case "yaml":
                return accessor.toYaml();
            case "toml":
                return accessor.toToml();
            case "xml":
                return accessor.toXml();
            default:
                return accessor.transform(format);
        }
    }
    return accessor.toJson(pretty ?? true);
}

/**
 * Prints a value to stdout, formatting objects as JSON.
 *
 * @param value - The value to print.
 * @param stdout - The output stream.
 */
export function printValue(
    value: unknown,
    stdout: { write(s: string): void },
): void {
    if (value === null || value === undefined) {
        stdout.write("null\n");
    } else if (typeof value === "string") {
        stdout.write(value + "\n");
    } else {
        stdout.write(JSON.stringify(value, null, 2) + "\n");
    }
}

/**
 * Parses a comma-separated string of mask patterns.
 *
 * @param raw - Comma-separated pattern string.
 * @returns Array of mask patterns.
 */
export function parseMaskPatterns(raw: string): MaskPattern[] {
    return raw.split(",").map((p) => p.trim());
}

/**
 * Parses a raw string as JSON, falling back to the raw string if parsing fails.
 *
 * @param raw - The raw string value.
 * @returns Parsed JSON value or the original string.
 */
export function parseJsonValue(raw: string): unknown {
    try {
        return JSON.parse(raw);
    } catch {
        return raw;
    }
}

// ─── Command Handlers ────────────────────────────────────────────────

/**
 * Handles the `get` command — retrieves a value at a given path.
 *
 * @param rest - Arguments after the command name.
 * @param io - CLI I/O abstraction.
 * @returns Exit code.
 */
export function handleGet(rest: string[], io: CliIO): number {
    const { values, positionals } = parseArgs({
        args: rest,
        options: {
            default: { type: "string", short: "d" },
        },
        allowPositionals: true,
        strict: false,
    });
    if (positionals.length < 2) {
        io.stderr.write(
            "Usage: safe-access get <file> <path> [--default <value>]\n",
        );
        return 1;
    }
    const accessor = loadFromStdinOrFile(
        positionals[0],
        undefined,
        io.readFileSync,
    );
    const defaultVal =
        values.default !== undefined
            ? parseJsonValue(values.default as string)
            : null;
    const result = accessor.get(positionals[1], defaultVal);
    printValue(result, io.stdout);
    return 0;
}

/**
 * Handles the `set` command — sets a value at a given path.
 *
 * @param rest - Arguments after the command name.
 * @param io - CLI I/O abstraction.
 * @returns Exit code.
 */
export function handleSet(rest: string[], io: CliIO): number {
    const { values, positionals } = parseArgs({
        args: rest,
        options: {
            to: { type: "string" },
            pretty: { type: "boolean", default: false },
        },
        allowPositionals: true,
        strict: false,
    });
    if (positionals.length < 3) {
        io.stderr.write(
            "Usage: safe-access set <file> <path> <value> [--to <format>]\n",
        );
        return 1;
    }
    const accessor = loadFromStdinOrFile(
        positionals[0],
        undefined,
        io.readFileSync,
    );
    const newVal = parseJsonValue(positionals[2]);
    const updated = accessor.set(positionals[1], newVal);
    io.stdout.write(
        formatOutput(
            updated,
            values.to as string | undefined,
            values.pretty as boolean,
        ) + "\n",
    );
    return 0;
}

/**
 * Handles the `remove` command — removes a key at a given path.
 *
 * @param rest - Arguments after the command name.
 * @param io - CLI I/O abstraction.
 * @returns Exit code.
 */
export function handleRemove(rest: string[], io: CliIO): number {
    const { values, positionals } = parseArgs({
        args: rest,
        options: {
            to: { type: "string" },
            pretty: { type: "boolean", default: false },
        },
        allowPositionals: true,
        strict: false,
    });
    if (positionals.length < 2) {
        io.stderr.write(
            "Usage: safe-access remove <file> <path> [--to <format>]\n",
        );
        return 1;
    }
    const accessor = loadFromStdinOrFile(
        positionals[0],
        undefined,
        io.readFileSync,
    );
    const updated = accessor.remove(positionals[1]);
    io.stdout.write(
        formatOutput(
            updated,
            values.to as string | undefined,
            values.pretty as boolean,
        ) + "\n",
    );
    return 0;
}

/**
 * Handles the `convert` / `transform` command — converts between data formats.
 *
 * @param rest - Arguments after the command name.
 * @param io - CLI I/O abstraction.
 * @returns Exit code.
 */
export function handleTransform(rest: string[], io: CliIO): number {
    const { values, positionals } = parseArgs({
        args: rest,
        options: {
            to: { type: "string" },
            from: { type: "string" },
            file: { type: "string" },
            pretty: { type: "boolean", default: false },
        },
        allowPositionals: true,
        strict: false,
    });
    const hasFile = positionals.length > 0 || typeof values.file === "string";
    if (!hasFile || !values.to) {
        io.stderr.write(
            "Usage: safe-access transform <file> --to <format>\n       safe-access convert --file <file> --to <format>\n       safe-access convert --from <format> --to <format> < input\n",
        );
        return 1;
    }
    const filePath = (values.file as string | undefined) ?? positionals[0];
    const accessor = loadFromStdinOrFile(
        filePath,
        values.from as string | undefined,
        io.readFileSync,
    );
    io.stdout.write(
        formatOutput(accessor, values.to as string, values.pretty as boolean) +
            "\n",
    );
    return 0;
}

/**
 * Handles the `diff` command — computes JSON Patch diff between two files.
 *
 * @param rest - Arguments after the command name.
 * @param io - CLI I/O abstraction.
 * @returns Exit code.
 */
export function handleDiff(rest: string[], io: CliIO): number {
    if (rest.length < 2) {
        io.stderr.write("Usage: safe-access diff <file1> <file2>\n");
        return 1;
    }
    const a = loadFromStdinOrFile(rest[0], undefined, io.readFileSync);
    const b = loadFromStdinOrFile(rest[1], undefined, io.readFileSync);
    const patches = diff(a.toObject(), b.toObject());
    io.stdout.write(JSON.stringify(patches, null, 2) + "\n");
    return 0;
}

/**
 * Handles the `mask` command — masks sensitive fields in data.
 *
 * @param rest - Arguments after the command name.
 * @param io - CLI I/O abstraction.
 * @returns Exit code.
 */
export function handleMask(rest: string[], io: CliIO): number {
    const { values, positionals } = parseArgs({
        args: rest,
        options: {
            patterns: { type: "string", short: "p" },
            to: { type: "string" },
            pretty: { type: "boolean", default: false },
        },
        allowPositionals: true,
        strict: false,
    });
    if (positionals.length < 1 || !values.patterns) {
        io.stderr.write(
            "Usage: safe-access mask <file> --patterns <pattern,...>\n",
        );
        return 1;
    }
    const accessor = loadFromStdinOrFile(
        positionals[0],
        undefined,
        io.readFileSync,
    );
    const patterns = parseMaskPatterns(values.patterns as string);
    const data = accessor.toObject();
    const masked = mask(data, patterns);
    const maskedAccessor = SafeAccess.from(masked, "object");
    io.stdout.write(
        formatOutput(
            maskedAccessor,
            values.to as string | undefined,
            values.pretty as boolean,
        ) + "\n",
    );
    return 0;
}

/**
 * Handles the `layer` command — merges multiple files in layer order.
 *
 * @param rest - Arguments after the command name.
 * @param io - CLI I/O abstraction.
 * @returns Exit code.
 */
export function handleLayer(rest: string[], io: CliIO): number {
    const { values, positionals } = parseArgs({
        args: rest,
        options: {
            to: { type: "string" },
            pretty: { type: "boolean", default: false },
        },
        allowPositionals: true,
        strict: false,
    });
    if (positionals.length < 1) {
        io.stderr.write(
            "Usage: safe-access layer <file1> [file2...] [--to <format>]\n",
        );
        return 1;
    }
    const accessors = positionals.map((f: string) =>
        loadFromStdinOrFile(f, undefined, io.readFileSync),
    );
    const layered = SafeAccess.layer(accessors);
    io.stdout.write(
        formatOutput(
            layered,
            values.to as string | undefined,
            values.pretty as boolean,
        ) + "\n",
    );
    return 0;
}

/**
 * Handles the `keys` command — lists keys at a given path.
 *
 * @param rest - Arguments after the command name.
 * @param io - CLI I/O abstraction.
 * @returns Exit code.
 */
export function handleKeys(rest: string[], io: CliIO): number {
    if (rest.length < 1) {
        io.stderr.write("Usage: safe-access keys <file> [path]\n");
        return 1;
    }
    const accessor = loadFromStdinOrFile(rest[0], undefined, io.readFileSync);
    const keys = rest.length >= 2 ? accessor.keys(rest[1]) : accessor.keys();
    io.stdout.write(keys.join("\n") + "\n");
    return 0;
}

/**
 * Handles the `type` command — returns the type of a value at a path.
 *
 * @param rest - Arguments after the command name.
 * @param io - CLI I/O abstraction.
 * @returns Exit code.
 */
export function handleType(rest: string[], io: CliIO): number {
    if (rest.length < 2) {
        io.stderr.write("Usage: safe-access type <file> <path>\n");
        return 1;
    }
    const accessor = loadFromStdinOrFile(rest[0], undefined, io.readFileSync);
    const t = accessor.type(rest[1]);
    io.stdout.write((t ?? "null") + "\n");
    return 0;
}

/**
 * Handles the `has` command — checks if a path exists.
 *
 * @param rest - Arguments after the command name.
 * @param io - CLI I/O abstraction.
 * @returns Exit code.
 */
export function handleHas(rest: string[], io: CliIO): number {
    if (rest.length < 2) {
        io.stderr.write("Usage: safe-access has <file> <path>\n");
        return 1;
    }
    const accessor = loadFromStdinOrFile(rest[0], undefined, io.readFileSync);
    const exists = accessor.has(rest[1]);
    io.stdout.write(exists ? "true\n" : "false\n");
    return exists ? 0 : 1;
}

/**
 * Handles the `count` command — counts elements at a path.
 *
 * @param rest - Arguments after the command name.
 * @param io - CLI I/O abstraction.
 * @returns Exit code.
 */
export function handleCount(rest: string[], io: CliIO): number {
    if (rest.length < 1) {
        io.stderr.write("Usage: safe-access count <file> [path]\n");
        return 1;
    }
    const accessor = loadFromStdinOrFile(rest[0], undefined, io.readFileSync);
    const c = rest.length >= 2 ? accessor.count(rest[1]) : accessor.count();
    io.stdout.write(c.toString() + "\n");
    return 0;
}

/**
 * Handles the `validate` command — validates data against a JSON Schema.
 *
 * @param rest - Arguments after the command name.
 * @param io - CLI I/O abstraction.
 * @returns Exit code.
 */
export function handleValidate(rest: string[], io: CliIO): number {
    const { values, positionals } = parseArgs({
        args: rest,
        options: {
            schema: { type: "string", short: "s" },
            format: { type: "string" },
        },
        allowPositionals: true,
        strict: false,
    });
    if (positionals.length < 1 || !values.schema) {
        io.stderr.write(
            "Usage: safe-access validate <file> --schema <schema.json>\n",
        );
        return 1;
    }
    const accessor = loadFromStdinOrFile(
        positionals[0],
        undefined,
        io.readFileSync,
    );
    const schemaContent = io.readFileSync(
        resolve(values.schema as string),
        "utf-8",
    ) as string;
    const schema = JSON.parse(schemaContent) as Record<string, unknown>;
    const data = accessor.toObject();
    const adapter = new JsonSchemaAdapter();
    const result = adapter.validate(data, schema);

    if (result.valid) {
        if (values.format === "json") {
            io.stdout.write(
                JSON.stringify({ valid: true, errors: [] }, null, 2) + "\n",
            );
        } else {
            io.stdout.write("valid\n");
        }
        return 0;
    } else {
        if (values.format === "json") {
            io.stdout.write(
                JSON.stringify(
                    { valid: false, errors: result.errors },
                    null,
                    2,
                ) + "\n",
            );
        } else {
            for (const e of result.errors) {
                io.stderr.write(`  ${e.path}: ${e.message}\n`);
            }
        }
        return 1;
    }
}
