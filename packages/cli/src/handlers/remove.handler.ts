import { parseArgs } from "node:util";
import {
    loadFromStdinOrFile,
    formatOutput,
    strOpt,
    boolOpt,
    type CliIO,
} from "../command-handlers.js";

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
        formatOutput(updated, strOpt(values.to), boolOpt(values.pretty)) + "\n",
    );
    return 0;
}
