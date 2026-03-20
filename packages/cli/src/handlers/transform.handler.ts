import { parseArgs } from "node:util";
import {
    loadFromStdinOrFile,
    formatOutput,
    strOpt,
    boolOpt,
    type CliIO,
} from "../command-handlers.js";

/**
 * Handles the `convert` / `transform` command — converts between data formats.
 *
 * @param rest - Arguments after the command name.
 * @param io - CLI I/O abstraction.
 * @returns Exit code.
 */
export function handleTransform(rest: string[], io: CliIO): number {
    const { values, positionals } = parseArgs({
        args: rest,
        options: {
            to: { type: "string" },
            from: { type: "string" },
            file: { type: "string" },
            pretty: { type: "boolean", default: false },
        },
        allowPositionals: true,
        strict: false,
    });
    const hasFile = positionals.length > 0 || typeof values.file === "string";
    if (!hasFile || !values.to) {
        io.stderr.write(
            "Usage: safe-access transform <file> --to <format>\n       safe-access convert --file <file> --to <format>\n       safe-access convert --from <format> --to <format> < input\n",
        );
        return 1;
    }
    const filePath = strOpt(values.file) ?? positionals[0];
    const accessor = loadFromStdinOrFile(
        filePath,
        strOpt(values.from),
        io.readFileSync,
    );
    io.stdout.write(
        formatOutput(accessor, strOpt(values.to), boolOpt(values.pretty)) +
            "\n",
    );
    return 0;
}
