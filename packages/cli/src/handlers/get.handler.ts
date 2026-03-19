import { parseArgs } from "node:util";
import {
    loadFromStdinOrFile,
    parseJsonValue,
    printValue,
    type CliIO,
} from "../command-handlers.js";

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
