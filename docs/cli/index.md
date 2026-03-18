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
