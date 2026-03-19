import { parseArgs } from "node:util";
import { SafeAccess, mask } from "@safe-access-inline/safe-access-inline";
import {
    loadFromStdinOrFile,
    parseMaskPatterns,
    formatOutput,
    type CliIO,
} from "../command-handlers.js";

/**
 * Handles the `mask` command — masks sensitive fields in data.
 *
 * @param rest - Arguments after the command name.
 * @param io - CLI I/O abstraction.
 * @returns Exit code.
 */
export function handleMask(rest: string[], io: CliIO): number {
    const { values, positionals } = parseArgs({
        args: rest,
        options: {
            patterns: { type: "string", short: "p" },
            to: { type: "string" },
            pretty: { type: "boolean", default: false },
        },
        allowPositionals: true,
        strict: false,
    });
    if (positionals.length < 1 || !values.patterns) {
        io.stderr.write(
            "Usage: safe-access mask <file> --patterns <pattern,...>\n",
        );
        return 1;
    }
    const accessor = loadFromStdinOrFile(
        positionals[0],
        undefined,
        io.readFileSync,
    );
    const patterns = parseMaskPatterns(values.patterns as string);
    const data = accessor.toObject();
    const masked = mask(data, patterns);
    const maskedAccessor = SafeAccess.from(masked, "object");
    io.stdout.write(
        formatOutput(
            maskedAccessor,
            values.to as string | undefined,
            values.pretty as boolean,
        ) + "\n",
    );
    return 0;
}
