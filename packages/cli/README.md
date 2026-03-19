<p align="center">
  <img src="https://raw.githubusercontent.com/felipesauer/safe-access-inline/main/docs/public/logo.svg" width="80" alt="Safe Access Inline logo">
</p>

<h1 align="center">@safe-access-inline/cli</h1>

<p align="center">
  Query, transform, and manipulate data files from the terminal — 14 commands, 8 formats, piping support.
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
safe-access get config.json "user.name"
safe-access get data.yaml "items.*.price"                        # wildcard
safe-access set config.json "user.email" "a@b.com" --to json     # set & output
safe-access transform config.yaml --to json --pretty              # convert formats
safe-access diff config.json config-updated.json                  # structural diff
safe-access mask config.json --patterns "password,secret,api_*"   # redact secrets
safe-access layer defaults.yaml overrides.json --to json          # merge layers
echo '{"a":1}' | safe-access get - "a"                           # stdin piping
```

## Documentation

> **Full command reference, piping examples, CI/CD recipes, and exit codes:**
> [safe-access-inline CLI docs →](https://felipesauer.github.io/safe-access-inline/cli/)
