import { loadFromStdinOrFile, type CliIO } from "../command-handlers.js";

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
