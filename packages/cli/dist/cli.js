// src/cli.ts
import { parseArgs } from "util";
import { readFileSync } from "fs";
import { resolve } from "path";
import {
  SafeAccess,
  diff,
  mask,
  JsonSchemaAdapter
} from "@safe-access-inline/safe-access-inline";
var HELP = `
safe-access \u2014 query, transform, and manipulate data files from the terminal.

Usage:
  safe-access get <file> <path> [--default <value>]
  safe-access set <file> <path> <value> [--to <format>]
  safe-access remove <file> <path> [--to <format>]
  safe-access transform <file> --to <format>
  safe-access convert --from <format> --to <format> < input
  safe-access convert --file <file> --to <format>
  safe-access diff <file1> <file2>
  safe-access mask <file> --patterns <pattern,...>
  safe-access layer <file1> [file2...] [--to <format>]
  safe-access keys <file> [path]
  safe-access type <file> <path>
  safe-access has <file> <path>
  safe-access count <file> [path]
  safe-access validate <file> --schema <schema.json>

Options:
  --from <format>      Input format for convert (when piping via stdin)
  --to <format>       Output format (json, yaml, toml, xml, ini, csv, env, ndjson)
  --default <value>   Default value for get (default: null)
  --pretty            Pretty-print JSON output
  --patterns <p,...>  Mask patterns (comma-separated key names or wildcards)
  --schema <file>     JSON Schema file for validate command
  --help, -h          Show this help
  --version, -v       Show version

Supported formats: json, yaml, toml, xml, ini, csv, env, ndjson (auto-detected from extension)

Examples:
  safe-access get config.json "user.name"
  safe-access get data.yaml "items.*.price"
  safe-access get config.toml "database.host" --default localhost
  safe-access set config.json "user.email" "a@b.com" | safe-access get - "user.email"
  safe-access transform config.yaml --to json --pretty
  safe-access convert --file config.yaml --to json
  safe-access convert --from yaml --to json < input.yaml
  safe-access diff config.json config-updated.json
  safe-access mask config.json --patterns "password,secret,api_*"
  safe-access layer defaults.yaml overrides.json --to json
  safe-access keys config.json "user"
`.trim();
function defaultGetVersion() {
  try {
    const pkg = JSON.parse(
      readFileSync(new URL("../package.json", import.meta.url), "utf-8")
    );
    return pkg.version ?? "0.0.0";
  } catch {
    return "0.0.0";
  }
}
function loadFromStdinOrFile(fileArg, fromFormat, readFileFn = readFileSync) {
  if (fileArg === "-") {
    const buf = readFileFn(0, "utf-8");
    if (fromFormat) {
      return SafeAccess.from(buf, fromFormat);
    }
    return SafeAccess.detect(buf);
  }
  if (fromFormat) {
    return SafeAccess.fromFileSync(resolve(fileArg), { format: fromFormat });
  }
  return SafeAccess.fromFileSync(resolve(fileArg));
}
function formatOutput(accessor, format, pretty) {
  if (format) {
    switch (format) {
      case "json":
        return accessor.toJson(pretty ?? false);
      case "yaml":
        return accessor.toYaml();
      case "toml":
        return accessor.toToml();
      case "xml":
        return accessor.toXml();
      default:
        return accessor.transform(format);
    }
  }
  return accessor.toJson(pretty ?? true);
}
function printValue(value, stdout) {
  if (value === null || value === void 0) {
    stdout.write("null\n");
  } else if (typeof value === "string") {
    stdout.write(value + "\n");
  } else {
    stdout.write(JSON.stringify(value, null, 2) + "\n");
  }
}
function parseMaskPatterns(raw) {
  return raw.split(",").map((p) => p.trim());
}
function parseJsonValue(raw) {
  try {
    return JSON.parse(raw);
  } catch {
    return raw;
  }
}
function run(args, io) {
  if (args.length === 0 || args.includes("--help") || args.includes("-h")) {
    io.stdout.write(HELP + "\n");
    return 0;
  }
  if (args.includes("--version") || args.includes("-v")) {
    io.stdout.write(io.getVersion() + "\n");
    return 0;
  }
  const command = args[0];
  const rest = args.slice(1);
  try {
    switch (command) {
      case "get": {
        const { values, positionals } = parseArgs({
          args: rest,
          options: {
            default: { type: "string", short: "d" }
          },
          allowPositionals: true,
          strict: false
        });
        if (positionals.length < 2) {
          io.stderr.write("Usage: safe-access get <file> <path> [--default <value>]\n");
          return 1;
        }
        const accessor = loadFromStdinOrFile(positionals[0], void 0, io.readFileSync);
        const defaultVal = values.default !== void 0 ? parseJsonValue(values.default) : null;
        const result = accessor.get(positionals[1], defaultVal);
        printValue(result, io.stdout);
        return 0;
      }
      case "set": {
        const { values, positionals } = parseArgs({
          args: rest,
          options: {
            to: { type: "string" },
            pretty: { type: "boolean", default: false }
          },
          allowPositionals: true,
          strict: false
        });
        if (positionals.length < 3) {
          io.stderr.write("Usage: safe-access set <file> <path> <value> [--to <format>]\n");
          return 1;
        }
        const accessor = loadFromStdinOrFile(positionals[0], void 0, io.readFileSync);
        const newVal = parseJsonValue(positionals[2]);
        const updated = accessor.set(positionals[1], newVal);
        io.stdout.write(formatOutput(updated, values.to, values.pretty) + "\n");
        return 0;
      }
      case "remove": {
        const { values, positionals } = parseArgs({
          args: rest,
          options: {
            to: { type: "string" },
            pretty: { type: "boolean", default: false }
          },
          allowPositionals: true,
          strict: false
        });
        if (positionals.length < 2) {
          io.stderr.write("Usage: safe-access remove <file> <path> [--to <format>]\n");
          return 1;
        }
        const accessor = loadFromStdinOrFile(positionals[0], void 0, io.readFileSync);
        const updated = accessor.remove(positionals[1]);
        io.stdout.write(formatOutput(updated, values.to, values.pretty) + "\n");
        return 0;
      }
      case "convert":
      case "transform": {
        const { values, positionals } = parseArgs({
          args: rest,
          options: {
            to: { type: "string" },
            from: { type: "string" },
            file: { type: "string" },
            pretty: { type: "boolean", default: false }
          },
          allowPositionals: true,
          strict: false
        });
        const hasFile = positionals.length > 0 || typeof values.file === "string";
        if (!hasFile || !values.to) {
          io.stderr.write("Usage: safe-access transform <file> --to <format>\n       safe-access convert --file <file> --to <format>\n       safe-access convert --from <format> --to <format> < input\n");
          return 1;
        }
        const filePath = values.file ?? positionals[0];
        const accessor = loadFromStdinOrFile(filePath, values.from, io.readFileSync);
        io.stdout.write(formatOutput(accessor, values.to, values.pretty) + "\n");
        return 0;
      }
      case "diff": {
        if (rest.length < 2) {
          io.stderr.write("Usage: safe-access diff <file1> <file2>\n");
          return 1;
        }
        const a = loadFromStdinOrFile(rest[0], void 0, io.readFileSync);
        const b = loadFromStdinOrFile(rest[1], void 0, io.readFileSync);
        const patches = diff(a.toObject(), b.toObject());
        io.stdout.write(JSON.stringify(patches, null, 2) + "\n");
        return 0;
      }
      case "mask": {
        const { values, positionals } = parseArgs({
          args: rest,
          options: {
            patterns: { type: "string", short: "p" },
            to: { type: "string" },
            pretty: { type: "boolean", default: false }
          },
          allowPositionals: true,
          strict: false
        });
        if (positionals.length < 1 || !values.patterns) {
          io.stderr.write("Usage: safe-access mask <file> --patterns <pattern,...>\n");
          return 1;
        }
        const accessor = loadFromStdinOrFile(positionals[0], void 0, io.readFileSync);
        const patterns = parseMaskPatterns(values.patterns);
        const data = accessor.toObject();
        const masked = mask(data, patterns);
        const maskedAccessor = SafeAccess.from(masked, "object");
        io.stdout.write(formatOutput(maskedAccessor, values.to, values.pretty) + "\n");
        return 0;
      }
      case "layer": {
        const { values, positionals } = parseArgs({
          args: rest,
          options: {
            to: { type: "string" },
            pretty: { type: "boolean", default: false }
          },
          allowPositionals: true,
          strict: false
        });
        if (positionals.length < 1) {
          io.stderr.write("Usage: safe-access layer <file1> [file2...] [--to <format>]\n");
          return 1;
        }
        const accessors = positionals.map((f) => loadFromStdinOrFile(f, void 0, io.readFileSync));
        const layered = SafeAccess.layer(accessors);
        io.stdout.write(formatOutput(layered, values.to, values.pretty) + "\n");
        return 0;
      }
      case "keys": {
        if (rest.length < 1) {
          io.stderr.write("Usage: safe-access keys <file> [path]\n");
          return 1;
        }
        const accessor = loadFromStdinOrFile(rest[0], void 0, io.readFileSync);
        const keys = rest.length >= 2 ? accessor.keys(rest[1]) : accessor.keys();
        io.stdout.write(keys.join("\n") + "\n");
        return 0;
      }
      case "type": {
        if (rest.length < 2) {
          io.stderr.write("Usage: safe-access type <file> <path>\n");
          return 1;
        }
        const accessor = loadFromStdinOrFile(rest[0], void 0, io.readFileSync);
        const t = accessor.type(rest[1]);
        io.stdout.write((t ?? "null") + "\n");
        return 0;
      }
      case "has": {
        if (rest.length < 2) {
          io.stderr.write("Usage: safe-access has <file> <path>\n");
          return 1;
        }
        const accessor = loadFromStdinOrFile(rest[0], void 0, io.readFileSync);
        const exists = accessor.has(rest[1]);
        io.stdout.write(exists ? "true\n" : "false\n");
        return exists ? 0 : 1;
      }
      case "count": {
        if (rest.length < 1) {
          io.stderr.write("Usage: safe-access count <file> [path]\n");
          return 1;
        }
        const accessor = loadFromStdinOrFile(rest[0], void 0, io.readFileSync);
        const c = rest.length >= 2 ? accessor.count(rest[1]) : accessor.count();
        io.stdout.write(c.toString() + "\n");
        return 0;
      }
      case "validate": {
        const { values, positionals } = parseArgs({
          args: rest,
          options: {
            schema: { type: "string", short: "s" },
            format: { type: "string" }
          },
          allowPositionals: true,
          strict: false
        });
        if (positionals.length < 1 || !values.schema) {
          io.stderr.write("Usage: safe-access validate <file> --schema <schema.json>\n");
          return 1;
        }
        const accessor = loadFromStdinOrFile(positionals[0], void 0, io.readFileSync);
        const schemaContent = io.readFileSync(resolve(values.schema), "utf-8");
        const schema = JSON.parse(schemaContent);
        const data = accessor.toObject();
        const adapter = new JsonSchemaAdapter();
        const result = adapter.validate(data, schema);
        if (result.valid) {
          if (values.format === "json") {
            io.stdout.write(JSON.stringify({ valid: true, errors: [] }, null, 2) + "\n");
          } else {
            io.stdout.write("valid\n");
          }
          return 0;
        } else {
          if (values.format === "json") {
            io.stdout.write(JSON.stringify({ valid: false, errors: result.errors }, null, 2) + "\n");
          } else {
            for (const e of result.errors) {
              io.stderr.write(`  ${e.path}: ${e.message}
`);
            }
          }
          return 1;
        }
      }
      default:
        io.stderr.write(`Unknown command: ${command}
Run safe-access --help for usage.
`);
        return 1;
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    io.stderr.write(`Error: ${message}
`);
    return 1;
  }
}
function main() {
  const io = {
    stdout: process.stdout,
    stderr: process.stderr,
    readFileSync,
    getVersion: defaultGetVersion
  };
  const code = run(process.argv.slice(2), io);
  if (code !== 0) {
    process.exit(code);
  }
}
main();
export {
  HELP,
  defaultGetVersion,
  formatOutput,
  loadFromStdinOrFile,
  parseJsonValue,
  parseMaskPatterns,
  printValue,
  run
};
