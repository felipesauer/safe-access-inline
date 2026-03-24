import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { SafeAccess } from "@safe-access-inline/safe-access-inline";

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
    const content = readFileFn(resolve(fileArg), "utf-8") as string;
    if (fromFormat) {
        return SafeAccess.from(content, fromFormat);
    }
    return SafeAccess.detect(content);
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

/**
 * Extracts a string option from a `parseArgs` values map.
 *
 * Returns `undefined` when the value is absent or not a string, eliminating
 * the need for unsafe `as string | undefined` casts on `parseArgs` results.
 *
 * @param val - Raw value from the parseArgs values map.
 * @returns The string value, or `undefined`.
 */
export function strOpt(val: string | boolean | undefined): string | undefined {
    return typeof val === "string" ? val : undefined;
}

/**
 * Extracts a boolean option from a `parseArgs` values map.
 *
 * Returns `false` when the value is absent or not strictly `true`, eliminating
 * the need for unsafe `as boolean` casts on `parseArgs` results.
 *
 * @param val - Raw value from the parseArgs values map.
 * @returns The boolean value, defaulting to `false`.
 */
export function boolOpt(val: string | boolean | undefined): boolean {
    return val === true;
}
