import { loadFromStdinOrFile, type CliIO } from "../command-handlers.js";

/**
 * Handles the `keys` command — lists keys at a given path.
 *
 * @param rest - Arguments after the command name.
 * @param io - CLI I/O abstraction.
 * @returns Exit code.
 */
export function handleKeys(rest: string[], io: CliIO): number {
    if (rest.length < 1) {
        io.stderr.write("Usage: safe-access keys <file> [path]\n");
        return 1;
    }
    const accessor = loadFromStdinOrFile(rest[0], undefined, io.readFileSync);
    // Stryker disable next-line ConditionalExpression -- equivalent: accessor.keys(undefined) === accessor.keys()
    const keys = rest.length >= 2 ? accessor.keys(rest[1]) : accessor.keys();
    io.stdout.write(keys.join("\n") + "\n");
    return 0;
}
