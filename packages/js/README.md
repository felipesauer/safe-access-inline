<p align="center">
  <img src="https://raw.githubusercontent.com/felipesauer/safe-access-inline/main/docs/public/logo.svg" width="80" alt="Safe Access Inline logo">
</p>

<h1 align="center">@safe-access-inline/safe-access-inline</h1>

<p align="center">
  Safe nested data access with dot notation for JavaScript &amp; TypeScript — 10 formats, zero surprises.
</p>

<p align="center">
  <a href="https://github.com/felipesauer/safe-access-inline/actions/workflows/js-ci.yml"><img src="https://github.com/felipesauer/safe-access-inline/actions/workflows/js-ci.yml/badge.svg" alt="JS CI"></a>
  <a href="https://www.npmjs.com/package/@safe-access-inline/safe-access-inline"><img src="https://img.shields.io/npm/v/@safe-access-inline/safe-access-inline.svg" alt="npm"></a>
  <a href="https://www.npmjs.com/package/@safe-access-inline/safe-access-inline"><img src="https://img.shields.io/node/v/@safe-access-inline/safe-access-inline" alt="node"></a>
  <a href="../../LICENSE"><img src="https://img.shields.io/badge/License-MIT-blue.svg" alt="MIT"></a>
</p>

<p align="center">
  <a href="https://felipesauer.github.io/safe-access-inline"><strong>Documentation</strong></a> ·
  <a href="https://felipesauer.github.io/safe-access-inline/js/getting-started">Getting Started</a> ·
  <a href="https://felipesauer.github.io/safe-access-inline/js/api-reference">API Reference</a> ·
  <a href="https://felipesauer.github.io/safe-access-inline/js/plugins">Plugins</a>
</p>

---

## Install

```bash
npm install @safe-access-inline/safe-access-inline
```

## Usage

```typescript
import { SafeAccess } from '@safe-access-inline/safe-access-inline';

const accessor = SafeAccess.from(
    '{"user": {"name": "Ana"}, "items": [{"price": 10}, {"price": 50}]}',
);

accessor.get('user.name'); // "Ana"
accessor.get('user.email', 'N/A'); // "N/A" — never throws
accessor.get('items.*.price'); // [10, 50] — wildcard
accessor.get('items[?price>20].price'); // [50] — filter
accessor.get('..name'); // ["Ana"] — recursive descent
```

Supports **Array · Object · JSON · XML · YAML · TOML · INI · CSV · ENV · NDJSON**.

## Contributing

See [CONTRIBUTING.md](../../CONTRIBUTING.md) for development setup, coding standards, and commit conventions.

## License

[MIT](../../LICENSE) © Felipe Sauer
