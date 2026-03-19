---
outline: deep
---

# CLI

> Query, transform, and manipulate data files from the terminal.

## Install

```bash
npm install -g @safe-access-inline/cli
```

Or use with `npx`:

```bash
npx @safe-access-inline/cli get config.json "user.name"
```

## Commands

### `get` — Query a value

```bash
safe-access get <file> <path> [--default|-d <value>]
```

```bash
safe-access get config.json "user.name"
safe-access get data.yaml "items.*.price"
safe-access get config.toml "database.host" --default localhost
safe-access get config.toml "database.host" -d localhost
```

### `set` — Set a value (output to stdout)

```bash
safe-access set <file> <path> <value> [--to <format>] [--pretty]
```

```bash
safe-access set config.json "database.port" 3306 --to json --pretty
```

### `remove` — Remove a path (output to stdout)

```bash
safe-access remove <file> <path> [--to <format>] [--pretty]
```

```bash
safe-access remove config.json "database.port" --to json --pretty
```

### `transform` — Convert between formats

```bash
safe-access transform <file> --to <format> [--pretty]
```

```bash
safe-access transform config.yaml --to json --pretty
safe-access transform config.json --to yaml
safe-access transform config.json --to toml
```

### `diff` — JSON Patch diff

```bash
safe-access diff <file1> <file2>
```

```bash
safe-access diff config.json config-updated.json
```

### `mask` — Mask sensitive data

```bash
safe-access mask <file> --patterns|-p <pattern,...> [--to <format>] [--pretty]
```

```bash
safe-access mask config.json --patterns "password,secret,api_*"
safe-access mask config.json -p "password,secret,api_*"
```

### `layer` — Merge config files

```bash
safe-access layer <file1> [file2...] [--to <format>] [--pretty]
```

```bash
safe-access layer defaults.yaml overrides.json --to json --pretty
```

### `keys` — List keys

```bash
safe-access keys <file> [path]
```

### `type` — Get value type

```bash
safe-access type <file> <path>
```

### `has` — Check if path exists

```bash
safe-access has <file> <path>
```

```bash
safe-access has config.json "database.host"   # exits 0 if exists, 1 if not
```

### `count` — Count elements

```bash
safe-access count <file> [path]
```

```bash
safe-access count config.json           # count root keys
safe-access count config.json "items"   # count elements at path
```

### `validate` — Validate against a JSON Schema

```bash
safe-access validate <file> --schema|-s <schema.json> [--format json]
```

```bash
safe-access validate config.json --schema schema.json
safe-access validate config.json -s schema.json

# Output validation result as structured JSON ({ valid, errors[] })
safe-access validate config.json --schema schema.json --format json
```

### `convert` — Convert format (file or stdin)

```bash
safe-access convert --file <file> --to <format>
safe-access convert --from <format> --to <format> < input
```

```bash
safe-access convert --file config.yaml --to json
safe-access convert --from yaml --to toml < config.yaml
```

## Supported Formats

The CLI auto-detects file format from the extension:

`.json` · `.yaml` / `.yml` · `.toml` · `.xml` · `.ini` · `.csv` · `.env` · `.ndjson`

## Piping & Stdin

Use `-` as the file argument to read from stdin. The CLI auto-detects the format from the input content.

```bash
# Pipe JSON from another command
echo '{"user": {"name": "Ana"}}' | safe-access get - "user.name"

# Chain commands: set a value, then read it back
safe-access set config.json "version" '"2.0"' | safe-access get - "version"

# Convert between formats via pipe
cat config.yaml | safe-access convert --from yaml --to json

# Pipe from curl
curl -s https://api.example.com/config.json | safe-access get - "database.host"
```

When piping with `convert`, use `--from` to specify the input format explicitly:

```bash
safe-access convert --from yaml --to toml < config.yaml
```

Output always goes to **stdout**, errors to **stderr** — so you can safely redirect output to files:

```bash
safe-access transform config.yaml --to json --pretty > config.json
safe-access mask config.json --patterns "password,secret" > config-safe.json
```

## Exit Codes

| Code | Meaning                                                                                   |
| ---- | ----------------------------------------------------------------------------------------- |
| `0`  | Success                                                                                   |
| `1`  | Error — invalid usage, unknown command, file not found, or `has` when path does not exist |

The `has` command uses exit codes for boolean results:

```bash
safe-access has config.json "database.host" && echo "exists" || echo "missing"
```

Set `DEBUG=1` to include stack traces on stderr:

```bash
DEBUG=1 safe-access get config.json "invalid..path"
```

## CI/CD Usage

### Config Validation in CI

```bash
# Validate config against a schema — exits 1 on failure
safe-access validate config.json --schema schema.json

# Structured JSON output for further processing
safe-access validate config.json --schema schema.json --format json
```

### Check Required Keys

```bash
# Fail the build if a required key is missing
safe-access has config.json "database.host" || exit 1
safe-access has config.json "database.port" || exit 1
```

### Extract Values for Scripts

```bash
# Use in shell variables
DB_HOST=$(safe-access get config.json "database.host")
APP_VERSION=$(safe-access get package.json "version")
```

### Mask Secrets Before Logging

```bash
# Safe to log/commit — all sensitive fields redacted
safe-access mask config.json --patterns "password,secret,*_KEY,*_TOKEN" --to json --pretty
```

### Config Layer Merging

```bash
# Merge base → environment → local overrides
safe-access layer defaults.json production.json local.json --to json --pretty > merged.json
```

## Examples

```bash
# Query nested value from YAML
safe-access get docker-compose.yml "services.web.ports"

# Convert JSON to TOML
safe-access transform config.json --to toml

# Mask secrets before sharing
safe-access mask .env --patterns "SECRET_*,API_KEY" --to env

# Merge multiple config layers
safe-access layer defaults.json staging.json local.json --to json --pretty
```
