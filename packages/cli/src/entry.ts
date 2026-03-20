import { readFileSync } from "node:fs";
import { run, defaultGetVersion, type CliIO } from "./cli.js";

/**
 * CLI entry point. Wires up I/O and delegates to {@link run}.
 * Exits the process with a non-zero code on failure.
 */
function main(): void {
    const io: CliIO = {
        stdout: process.stdout,
        stderr: process.stderr,
        readFileSync,
        getVersion: defaultGetVersion,
    };
    const code = run(process.argv.slice(2), io);
    if (code !== 0) {
        process.exit(code);
    }
}

main();
