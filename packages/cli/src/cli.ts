import { readFileSync } from "node:fs";
import { handleGet } from "./handlers/get.handler.js";
import { handleSet } from "./handlers/set.handler.js";
import { handleRemove } from "./handlers/remove.handler.js";
import { handleKeys } from "./handlers/keys.handler.js";
import { handleType } from "./handlers/type.handler.js";
import { handleHas } from "./handlers/has.handler.js";
import { handleCount } from "./handlers/count.handler.js";
import { type CliIO } from "./command-handlers.js";

export type { CliIO } from "./command-handlers.js";
export {
    loadFromStdinOrFile,
    printValue,
    parseJsonValue,
    strOpt,
    boolOpt,
} from "./command-handlers.js";

export const HELP = `
safe-access — query and manipulate data files from the terminal.

Usage:
  safe-access get <file> <path> [--default <value>]
  safe-access set <file> <path> <value> [--pretty]
  safe-access remove <file> <path> [--pretty]
  safe-access keys <file> [path]
  safe-access type <file> <path>
  safe-access has <file> <path>
  safe-access count <file> [path]

Options:
  --default <value>    Default value for get (default: null)
  --pretty             Pretty-print JSON output
  --help, -h           Show this help
  --version, -v        Show version

Supported formats: json, yaml, toml, xml, ini, env, ndjson (auto-detected from extension)

Examples:
  safe-access get config.json "user.name"
  safe-access get data.yaml "items.*.price"
  safe-access get config.toml "database.host" --default localhost
  safe-access set config.json "user.email" "a@b.com" | safe-access get - "user.email"
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
            case "keys":
                return handleKeys(rest, io);
            case "type":
                return handleType(rest, io);
            case "has":
                return handleHas(rest, io);
            case "count":
                return handleCount(rest, io);
            default:
                io.stderr.write(
                    `Unknown command: ${command}\nRun safe-access --help for usage.\n`,
                );
                return 1;
        }
    } catch (err) {
        let message = err instanceof Error ? err.message : String(err);

        // Sanitize error messages to prevent internal path / network topology disclosure
        message = message.replace(
            /Path '.*?' is outside allowed directories\./,
            "Path is outside allowed directories.",
        );
        message = message.replace(
            /Host '.*?' is not in the allowed list\./,
            "Host is not in the allowed list.",
        );
        message = message.replace(
            /Port \d+ is not in the allowed list: \[.*?\]/,
            "Port is not in the allowed list.",
        );

        io.stderr.write(`Error: ${message}\n`);
        if (process.env.DEBUG === "1" && err instanceof Error && err.stack) {
            io.stderr.write(`${err.stack}\n`);
        }
        return 1;
    }
}
