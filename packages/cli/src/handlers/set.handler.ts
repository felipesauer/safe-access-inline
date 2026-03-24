import { parseArgs } from "node:util";
import {
    loadFromStdinOrFile,
    parseJsonValue,
    boolOpt,
    type CliIO,
} from "../command-handlers.js";

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
            pretty: { type: "boolean", default: false },
        },
        allowPositionals: true,
        strict: false,
    });
    if (positionals.length < 3) {
        io.stderr.write(
            "Usage: safe-access set <file> <path> <value> [--pretty]\n",
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
    io.stdout.write(updated.toJson(boolOpt(values.pretty)) + "\n");
    return 0;
}
