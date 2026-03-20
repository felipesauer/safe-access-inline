import { parseArgs } from "node:util";
import { SafeAccess } from "@safe-access-inline/safe-access-inline";
import {
    loadFromStdinOrFile,
    formatOutput,
    strOpt,
    boolOpt,
    type CliIO,
} from "../command-handlers.js";

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
        formatOutput(layered, strOpt(values.to), boolOpt(values.pretty)) + "\n",
    );
    return 0;
}
