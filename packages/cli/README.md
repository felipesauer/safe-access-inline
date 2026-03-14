# @safe-access-inline/cli

> CLI for safe-access-inline — query, transform, and manipulate data files from the terminal.

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
safe-access get <file> <path> [--default <value>]
```

```bash
safe-access get config.json "user.name"
safe-access get data.yaml "items.*.price"
safe-access get config.toml "database.host" --default localhost
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
safe-access mask <file> --patterns <pattern,...> [--to <format>] [--pretty]
```

```bash
safe-access mask config.json --patterns "password,secret,api_*"
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

### `has` — Check path existence

```bash
safe-access has <file> <path>
```

Exits with code 0 if path exists, 1 if not.

### `count` — Count elements

```bash
safe-access count <file> [path]
```

## Stdin

Use `-` to read from stdin:

```bash
echo '{"name": "Ana"}' | safe-access get - "name"
cat config.yaml | safe-access transform - --to json --pretty
```

## Supported Formats

JSON, YAML, TOML, XML, INI, CSV, ENV, NDJSON — auto-detected from file extension.

## Path Expressions

| Syntax    | Example               | Description       |
| --------- | --------------------- | ----------------- |
| `a.b.c`   | `user.profile.name`   | Nested key        |
| `a[0]`    | `items[0].title`      | Array index       |
| `a.*`     | `users.*.name`        | Wildcard          |
| `a[?f>v]` | `products[?price>20]` | Filter            |
| `..key`   | `..name`              | Recursive descent |

## License

MIT
