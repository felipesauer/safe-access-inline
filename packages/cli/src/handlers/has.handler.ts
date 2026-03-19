import { loadFromStdinOrFile, type CliIO } from "../command-handlers.js";

/**
 * Handles the `has` command — checks if a path exists.
 *
 * @param rest - Arguments after the command name.
 * @param io - CLI I/O abstraction.
 * @returns Exit code.
 */
export function handleHas(rest: string[], io: CliIO): number {
    if (rest.length < 2) {
        io.stderr.write("Usage: safe-access has <file> <path>\n");
        return 1;
    }
    const accessor = loadFromStdinOrFile(rest[0], undefined, io.readFileSync);
    const exists = accessor.has(rest[1]);
    io.stdout.write(exists ? "true\n" : "false\n");
    return exists ? 0 : 1;
}
