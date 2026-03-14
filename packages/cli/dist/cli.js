// src/cli.ts
import { parseArgs } from "util";
import { readFileSync } from "fs";
import { resolve } from "path";
import {
  SafeAccess,
  diff,
  mask
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
function getVersion() {
  try {
    const pkg = JSON.parse(
      readFileSync(new URL("../package.json", import.meta.url), "utf-8")
    );
    return pkg.version ?? "0.0.0";
  } catch {
    return "0.0.0";
  }
}
function loadFromStdinOrFile(fileArg, fromFormat) {
  if (fileArg === "-") {
    const buf = readFileSync(0, "utf-8");
    if (fromFormat) {
      return SafeAccess.from(buf, fromFormat);
    }
    return SafeAccess.detect(buf);
  }
  if (fromFormat) {
    const buf = readFileSync(resolve(fileArg), "utf-8");
    return SafeAccess.from(buf, fromFormat);
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
function printValue(value) {
  if (value === null || value === void 0) {
    process.stdout.write("null\n");
  } else if (typeof value === "string") {
    process.stdout.write(value + "\n");
  } else {
    process.stdout.write(JSON.stringify(value, null, 2) + "\n");
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
function validateJsonSchema(data, schema, path = "$") {
  const errors = [];
  if (schema.type !== void 0) {
    const expectedType = schema.type;
    const actualType = Array.isArray(data) ? "array" : data === null ? "null" : typeof data;
    const typeList = Array.isArray(expectedType) ? expectedType : [expectedType];
    if (!typeList.includes(actualType)) {
      errors.push({ path, message: `expected type '${typeList.join("|")}' but got '${actualType}'` });
      return errors;
    }
  }
  if (schema.required !== void 0 && typeof data === "object" && data !== null && !Array.isArray(data)) {
    const obj = data;
    for (const key of schema.required) {
      if (!(key in obj)) {
        errors.push({ path: `${path}.${key}`, message: "required field missing" });
      }
    }
  }
  if (schema.properties !== void 0 && typeof data === "object" && data !== null && !Array.isArray(data)) {
    const obj = data;
    const props = schema.properties;
    for (const [key, subSchema] of Object.entries(props)) {
      if (key in obj) {
        errors.push(...validateJsonSchema(obj[key], subSchema, `${path}.${key}`));
      }
    }
  }
  if (schema.items !== void 0 && Array.isArray(data)) {
    const itemSchema = schema.items;
    data.forEach((item, i) => {
      errors.push(...validateJsonSchema(item, itemSchema, `${path}[${i}]`));
    });
  }
  if (schema.minimum !== void 0 && typeof data === "number") {
    if (data < schema.minimum) {
      errors.push({ path, message: `value ${data} is less than minimum ${schema.minimum}` });
    }
  }
  if (schema.maximum !== void 0 && typeof data === "number") {
    if (data > schema.maximum) {
      errors.push({ path, message: `value ${data} exceeds maximum ${schema.maximum}` });
    }
  }
  if (schema.minLength !== void 0 && typeof data === "string") {
    if (data.length < schema.minLength) {
      errors.push({ path, message: `string length ${data.length} is less than minLength ${schema.minLength}` });
    }
  }
  if (schema.maxLength !== void 0 && typeof data === "string") {
    if (data.length > schema.maxLength) {
      errors.push({ path, message: `string length ${data.length} exceeds maxLength ${schema.maxLength}` });
    }
  }
  if (schema.enum !== void 0) {
    const enumVals = schema.enum;
    if (!enumVals.some((v) => JSON.stringify(v) === JSON.stringify(data))) {
      errors.push({ path, message: `value must be one of: ${enumVals.map((v) => JSON.stringify(v)).join(", ")}` });
    }
  }
  return errors;
}
function main() {
  const args = process.argv.slice(2);
  if (args.length === 0 || args.includes("--help") || args.includes("-h")) {
    process.stdout.write(HELP + "\n");
    return;
  }
  if (args.includes("--version") || args.includes("-v")) {
    process.stdout.write(getVersion() + "\n");
    return;
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
          process.stderr.write("Usage: safe-access get <file> <path> [--default <value>]\n");
          process.exit(1);
        }
        const accessor = loadFromStdinOrFile(positionals[0]);
        const defaultVal = values.default !== void 0 ? parseJsonValue(values.default) : null;
        const result = accessor.get(positionals[1], defaultVal);
        printValue(result);
        break;
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
          process.stderr.write("Usage: safe-access set <file> <path> <value> [--to <format>]\n");
          process.exit(1);
        }
        const accessor = loadFromStdinOrFile(positionals[0]);
        const newVal = parseJsonValue(positionals[2]);
        const updated = accessor.set(positionals[1], newVal);
        process.stdout.write(formatOutput(updated, values.to, values.pretty) + "\n");
        break;
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
          process.stderr.write("Usage: safe-access remove <file> <path> [--to <format>]\n");
          process.exit(1);
        }
        const accessor = loadFromStdinOrFile(positionals[0]);
        const updated = accessor.remove(positionals[1]);
        process.stdout.write(formatOutput(updated, values.to, values.pretty) + "\n");
        break;
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
          process.stderr.write("Usage: safe-access transform <file> --to <format>\n       safe-access convert --file <file> --to <format>\n       safe-access convert --from <format> --to <format> < input\n");
          process.exit(1);
        }
        const filePath = values.file ?? positionals[0];
        const accessor = loadFromStdinOrFile(filePath, values.from);
        process.stdout.write(formatOutput(accessor, values.to, values.pretty) + "\n");
        break;
      }
      case "diff": {
        if (rest.length < 2) {
          process.stderr.write("Usage: safe-access diff <file1> <file2>\n");
          process.exit(1);
        }
        const a = loadFromStdinOrFile(rest[0]);
        const b = loadFromStdinOrFile(rest[1]);
        const patches = diff(a.toObject(), b.toObject());
        process.stdout.write(JSON.stringify(patches, null, 2) + "\n");
        break;
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
          process.stderr.write("Usage: safe-access mask <file> --patterns <pattern,...>\n");
          process.exit(1);
        }
        const accessor = loadFromStdinOrFile(positionals[0]);
        const patterns = parseMaskPatterns(values.patterns);
        const data = accessor.toObject();
        const masked = mask(data, patterns);
        const maskedAccessor = SafeAccess.from(masked, "object");
        process.stdout.write(formatOutput(maskedAccessor, values.to, values.pretty) + "\n");
        break;
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
          process.stderr.write("Usage: safe-access layer <file1> [file2...] [--to <format>]\n");
          process.exit(1);
        }
        const accessors = positionals.map((f) => loadFromStdinOrFile(f));
        const layered = SafeAccess.layer(accessors);
        process.stdout.write(formatOutput(layered, values.to, values.pretty) + "\n");
        break;
      }
      case "keys": {
        if (rest.length < 1) {
          process.stderr.write("Usage: safe-access keys <file> [path]\n");
          process.exit(1);
        }
        const accessor = loadFromStdinOrFile(rest[0]);
        const keys = rest.length >= 2 ? accessor.keys(rest[1]) : accessor.keys();
        process.stdout.write(keys.join("\n") + "\n");
        break;
      }
      case "type": {
        if (rest.length < 2) {
          process.stderr.write("Usage: safe-access type <file> <path>\n");
          process.exit(1);
        }
        const accessor = loadFromStdinOrFile(rest[0]);
        const t = accessor.type(rest[1]);
        process.stdout.write((t ?? "null") + "\n");
        break;
      }
      case "has": {
        if (rest.length < 2) {
          process.stderr.write("Usage: safe-access has <file> <path>\n");
          process.exit(1);
        }
        const accessor = loadFromStdinOrFile(rest[0]);
        const exists = accessor.has(rest[1]);
        process.stdout.write(exists ? "true\n" : "false\n");
        process.exit(exists ? 0 : 1);
        break;
      }
      case "count": {
        if (rest.length < 1) {
          process.stderr.write("Usage: safe-access count <file> [path]\n");
          process.exit(1);
        }
        const accessor = loadFromStdinOrFile(rest[0]);
        const c = rest.length >= 2 ? accessor.count(rest[1]) : accessor.count();
        process.stdout.write(c.toString() + "\n");
        break;
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
          process.stderr.write("Usage: safe-access validate <file> --schema <schema.json>\n");
          process.exit(1);
        }
        const accessor = loadFromStdinOrFile(positionals[0]);
        const schemaContent = readFileSync(resolve(values.schema), "utf-8");
        const schema = JSON.parse(schemaContent);
        const data = accessor.toObject();
        const validationErrors = validateJsonSchema(data, schema);
        if (validationErrors.length === 0) {
          if (values.format === "json") {
            process.stdout.write(JSON.stringify({ valid: true, errors: [] }, null, 2) + "\n");
          } else {
            process.stdout.write("valid\n");
          }
          process.exit(0);
        } else {
          if (values.format === "json") {
            process.stdout.write(JSON.stringify({ valid: false, errors: validationErrors }, null, 2) + "\n");
          } else {
            for (const e of validationErrors) {
              process.stderr.write(`  ${e.path}: ${e.message}
`);
            }
          }
          process.exit(1);
        }
        break;
      }
      default:
        process.stderr.write(`Unknown command: ${command}
Run safe-access --help for usage.
`);
        process.exit(1);
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    process.stderr.write(`Error: ${message}
`);
    process.exit(1);
  }
}
main();
