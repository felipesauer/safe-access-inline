import { readFileSync } from "node:fs";
import { handleGet } from "./handlers/get.handler.js";
import { handleSet } from "./handlers/set.handler.js";
import { handleRemove } from "./handlers/remove.handler.js";
import { handleTransform } from "./handlers/transform.handler.js";
import { handleDiff } from "./handlers/diff.handler.js";
import { handleMask } from "./handlers/mask.handler.js";
import { handleLayer } from "./handlers/layer.handler.js";
import { handleKeys } from "./handlers/keys.handler.js";
import { handleType } from "./handlers/type.handler.js";
import { handleHas } from "./handlers/has.handler.js";
import { handleCount } from "./handlers/count.handler.js";
import { handleValidate } from "./handlers/validate.handler.js";
import { type CliIO } from "./command-handlers.js";

export type { CliIO } from "./command-handlers.js";
export {
    loadFromStdinOrFile,
    formatOutput,
    printValue,
    parseMaskPatterns,
    parseJsonValue,
} from "./command-handlers.js";

export const HELP = `
safe-access — query, transform, and manipulate data files from the terminal.

Usage:
  safe-access get <file> <path> [--default <value>]
  safe-access set <file> <path> <value> [--to <format>]
  safe-access remove <file> <path> [--to <format>]
  safe-access transform <file> --to <format>
  safe-access convert --from <format> --to <format> < input
  safe-access convert --file <file> --to <format>
  safe-access diff <file1> <file2>
  safe-access mask <file> --patterns <pattern,...>
  safe-access layer <file1> [file2...] [--to <format>]
  safe-access keys <file> [path]
  safe-access type <file> <path>
  safe-access has <file> <path>
  safe-access count <file> [path]
  safe-access validate <file> --schema <schema.json>

Options:
  --from <format>      Input format for convert (when piping via stdin)
  --to <format>       Output format (json, yaml, toml, xml, ini, csv, env, ndjson)
  --default <value>   Default value for get (default: null)
  --pretty            Pretty-print JSON output
  --patterns <p,...>  Mask patterns (comma-separated key names or wildcards)
  --schema <file>     JSON Schema file for validate command
  --help, -h          Show this help
  --version, -v       Show version

Supported formats: json, yaml, toml, xml, ini, csv, env, ndjson (auto-detected from extension)

Examples:
  safe-access get config.json "user.name"
  safe-access get data.yaml "items.*.price"
  safe-access get config.toml "database.host" --default localhost
  safe-access set config.json "user.email" "a@b.com" | safe-access get - "user.email"
  safe-access transform config.yaml --to json --pretty
  safe-access convert --file config.yaml --to json
  safe-access convert --from yaml --to json < input.yaml
  safe-access diff config.json config-updated.json
  safe-access mask config.json --patterns "password,secret,api_*"
  safe-access layer defaults.yaml overrides.json --to json
  safe-access keys config.json "user"
`.trim();

/**
 * Reads the CLI package version from package.json.
 *
 * @returns The package version string, or "0.0.0" if unavailable.
 */
export function defaultGetVersion(): string {
    try {
        const pkg = JSON.parse(
            readFileSync(new URL("../package.json", import.meta.url), "utf-8"),
        );
        return pkg.version ?? "0.0.0";
    } catch {
        return "0.0.0";
    }
}

/**
 * Main CLI dispatcher — parses top-level flags and delegates to command handlers.
 *
 * @param args - CLI arguments (without node/script prefix).
 * @param io - CLI I/O abstraction.
 * @returns Exit code (0 = success, non-zero = failure).
 */
export function run(args: string[], io: CliIO): number {
    if (args.length === 0 || args.includes("--help") || args.includes("-h")) {
        io.stdout.write(HELP + "\n");
        return 0;
    }

    if (args.includes("--version") || args.includes("-v")) {
        io.stdout.write(io.getVersion() + "\n");
        return 0;
    }

    const command = args[0];
    const rest = args.slice(1);

    try {
        switch (command) {
            case "get":
                return handleGet(rest, io);
            case "set":
                return handleSet(rest, io);
            case "remove":
                return handleRemove(rest, io);
            case "convert":
            case "transform":
                return handleTransform(rest, io);
            case "diff":
                return handleDiff(rest, io);
            case "mask":
                return handleMask(rest, io);
            case "layer":
                return handleLayer(rest, io);
            case "keys":
                return handleKeys(rest, io);
            case "type":
                return handleType(rest, io);
            case "has":
                return handleHas(rest, io);
            case "count":
                return handleCount(rest, io);
            case "validate":
                return handleValidate(rest, io);
            default:
                io.stderr.write(
                    `Unknown command: ${command}\nRun safe-access --help for usage.\n`,
                );
                return 1;
        }
    } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        io.stderr.write(`Error: ${message}\n`);
        if (process.env.DEBUG === "1" && err instanceof Error && err.stack) {
            io.stderr.write(`${err.stack}\n`);
        }
        return 1;
    }
}
