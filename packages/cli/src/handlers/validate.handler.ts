import { parseArgs } from "node:util";
import { resolve } from "node:path";
import { JsonSchemaAdapter } from "@safe-access-inline/safe-access-inline";
import {
    loadFromStdinOrFile,
    strOpt,
    type CliIO,
} from "../command-handlers.js";

/**
 * Handles the `validate` command — validates data against a JSON Schema.
 *
 * @param rest - Arguments after the command name.
 * @param io - CLI I/O abstraction.
 * @returns Exit code.
 */
export function handleValidate(rest: string[], io: CliIO): number {
    const { values, positionals } = parseArgs({
        args: rest,
        options: {
            schema: { type: "string", short: "s" },
            format: { type: "string" },
        },
        allowPositionals: true,
        strict: false,
    });
    if (positionals.length < 1 || !values.schema) {
        io.stderr.write(
            "Usage: safe-access validate <file> --schema <schema.json>\n",
        );
        return 1;
    }
    const accessor = loadFromStdinOrFile(
        positionals[0],
        undefined,
        io.readFileSync,
    );
    let schemaContent: string;
    try {
        schemaContent = io.readFileSync(
            resolve(strOpt(values.schema) ?? ""),
            "utf-8",
        ) as string;
    } catch (e) {
        const errDetail =
            e instanceof Error
                ? ((e as NodeJS.ErrnoException).code ?? e.message)
                : String(e);
        io.stderr.write(`Error: Schema file could not be read: ${errDetail}\n`);
        return 1;
    }
    let schema: Record<string, unknown>;
    try {
        schema = JSON.parse(schemaContent) as Record<string, unknown>;
    } catch (e) {
        // JSON.parse always throws SyntaxError which extends Error
        io.stderr.write(
            `Error: Schema file is not valid JSON: ${(e as Error).message}\n`,
        );
        return 1;
    }
    const data = accessor.toObject();
    const adapter = new JsonSchemaAdapter();
    const result = adapter.validate(data, schema);

    if (result.valid) {
        if (values.format === "json") {
            io.stdout.write(
                JSON.stringify({ valid: true, errors: [] }, null, 2) + "\n",
            );
        } else {
            io.stdout.write("valid\n");
        }
        return 0;
    } else {
        if (values.format === "json") {
            io.stdout.write(
                JSON.stringify(
                    { valid: false, errors: result.errors },
                    null,
                    2,
                ) + "\n",
            );
        } else {
            for (const e of result.errors) {
                io.stderr.write(`  ${e.path}: ${e.message}\n`);
            }
        }
        return 1;
    }
}
