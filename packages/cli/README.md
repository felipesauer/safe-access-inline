<p align="center">
  <img src="https://raw.githubusercontent.com/felipesauer/safe-access-inline/main/docs/public/logo.svg" width="80" alt="Safe Access Inline logo">
</p>

<h1 align="center">@safe-access-inline/cli</h1>

<p align="center">
  Query, transform, and manipulate data files from the terminal — 9 commands, 8 formats, piping support.
</p>

<p align="center">
  <a href="https://github.com/felipesauer/safe-access-inline/actions/workflows/cli-ci.yml"><img src="https://github.com/felipesauer/safe-access-inline/actions/workflows/cli-ci.yml/badge.svg" alt="CLI CI"></a>
  <a href="https://www.npmjs.com/package/@safe-access-inline/cli"><img src="https://img.shields.io/npm/v/@safe-access-inline/cli.svg" alt="npm"></a>
  <a href="https://www.npmjs.com/package/@safe-access-inline/cli"><img src="https://img.shields.io/node/v/@safe-access-inline/cli" alt="node"></a>
  <a href="../../LICENSE"><img src="https://img.shields.io/badge/License-MIT-blue.svg" alt="MIT"></a>
</p>

<p align="center">
  <a href="https://felipesauer.github.io/safe-access-inline"><strong>Documentation</strong></a> ·
  <a href="https://felipesauer.github.io/safe-access-inline/cli/">CLI Reference</a> ·
  <a href="https://felipesauer.github.io/safe-access-inline/guide/">Guide</a>
</p>

---

## Install

```bash
npm install -g @safe-access-inline/cli
```

## Usage

```bash
# Read values
safe-access get config.json "user.name"
safe-access get data.yaml "items.*.price"                         # wildcard
safe-access get config.toml "database.host" --default localhost   # default value

# Modify data
safe-access set config.json "user.email" "a@b.com" --to json --pretty
safe-access remove config.json "user.token" --to yaml

# Inspect structure
safe-access keys config.json "database"           # list keys at a path
safe-access type config.json "database.port"      # "number"
safe-access has config.json "database.host"       # exits 0=exists, 1=missing
safe-access count config.json "items"             # number of elements

# Convert formats
safe-access transform config.yaml --to json --pretty
safe-access convert --file config.yaml --to toml
safe-access convert --from yaml --to json < input.yaml

# Stdin piping
echo '{"a":1}' | safe-access get - "a"
```

## Exit Codes

| Code | Meaning                                                                   |
| ---- | ------------------------------------------------------------------------- |
| `0`  | Success                                                                   |
| `1`  | Error (missing args, file not found, validation failure, unknown command) |

The `has` command uses exit codes as a boolean signal: exits `0` when the path exists, `1` when it does not — suitable for shell scripting:

```bash
safe-access has config.json "database.host" && echo "host configured"
```

## Documentation

> **Full command reference, piping examples, CI/CD recipes, and exit codes:**
> [safe-access-inline CLI docs →](https://felipesauer.github.io/safe-access-inline/cli/)
