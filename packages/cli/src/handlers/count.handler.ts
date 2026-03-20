import { loadFromStdinOrFile, type CliIO } from "../command-handlers.js";

/**
 * Handles the `count` command — counts elements at a path.
 *
 * @param rest - Arguments after the command name.
 * @param io - CLI I/O abstraction.
 * @returns Exit code.
 */
export function handleCount(rest: string[], io: CliIO): number {
    if (rest.length < 1) {
        io.stderr.write("Usage: safe-access count <file> [path]\n");
        return 1;
    }
    const accessor = loadFromStdinOrFile(rest[0], undefined, io.readFileSync);
    // Stryker disable next-line ConditionalExpression -- equivalent: accessor.count(undefined) === accessor.count()
    const c = rest.length >= 2 ? accessor.count(rest[1]) : accessor.count();
    io.stdout.write(c.toString() + "\n");
    return 0;
}
