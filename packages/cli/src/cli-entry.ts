import { readFileSync } from "node:fs";
import { run, defaultGetVersion, type CliIO } from "./cli.js";

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
