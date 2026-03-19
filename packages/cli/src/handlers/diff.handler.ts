import { diff } from "@safe-access-inline/safe-access-inline";
import { loadFromStdinOrFile, type CliIO } from "../command-handlers.js";

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
