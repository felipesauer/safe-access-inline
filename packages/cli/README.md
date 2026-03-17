<p align="center">
  <img src="../../docs/public/logo.svg" width="80" alt="Safe Access Inline logo">
</p>

<h1 align="center">@safe-access-inline/cli</h1>

<p align="center">
  Query, transform, and manipulate data files from the terminal.
</p>

<p align="center">
  <a href="https://www.npmjs.com/package/@safe-access-inline/cli"><img src="https://img.shields.io/npm/v/@safe-access-inline/cli.svg" alt="npm"></a>
  <a href="https://www.npmjs.com/package/@safe-access-inline/cli"><img src="https://img.shields.io/npm/dm/@safe-access-inline/cli" alt="downloads"></a>
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
safe-access transform config.yaml --to json --pretty
safe-access mask config.json --patterns "password,secret"
echo '{"a":1}' | safe-access get - "a"
```

## Contributing

See [CONTRIBUTING.md](../../CONTRIBUTING.md) for development setup, coding standards, and commit conventions.

## License

[MIT](../../LICENSE) © Felipe Sauer
