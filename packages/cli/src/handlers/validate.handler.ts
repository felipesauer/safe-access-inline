import { parseArgs } from "node:util";
import { resolve } from "node:path";
import { JsonSchemaAdapter } from "@safe-access-inline/safe-access-inline";
import { loadFromStdinOrFile, type CliIO } from "../command-handlers.js";

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
    const schemaContent = io.readFileSync(
        resolve(values.schema as string),
        "utf-8",
    ) as string;
    const schema = JSON.parse(schemaContent) as Record<string, unknown>;
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
