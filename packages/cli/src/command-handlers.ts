import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import {
    SafeAccess,
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
    // Stryker disable next-line ConditionalExpression -- equivalent: JSON.stringify(null) === "null" in both branches
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
