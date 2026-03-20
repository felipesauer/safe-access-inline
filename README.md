<p align="center">
  <img src="docs/public/logo.svg" width="80" alt="safe-access-inline logo">
</p>

<h1 align="center">Safe Access Inline</h1>

<p align="center">
  Safely access deeply nested data with dot notation — one API, 10 formats, PHP + JS/TS.
</p>

<p align="center">
  <a href="https://codecov.io/gh/felipesauer/safe-access-inline"><img src="https://codecov.io/gh/felipesauer/safe-access-inline/graph/badge.svg" alt="codecov"></a>
  <a href="LICENSE"><img src="https://img.shields.io/badge/License-MIT-blue.svg" alt="MIT"></a>
</p>

<p align="center">
  <a href="https://felipesauer.github.io/safe-access-inline"><strong>Documentation</strong></a> ·
  <a href="https://felipesauer.github.io/safe-access-inline/js/getting-started">JS/TS Guide</a> ·
  <a href="https://felipesauer.github.io/safe-access-inline/php/getting-started">PHP Guide</a> ·
  <a href="https://felipesauer.github.io/safe-access-inline/cli/">CLI</a>
</p>

---

## Install

```bash
# PHP
composer require safe-access-inline/safe-access-inline

# JavaScript / TypeScript
npm install @safe-access-inline/safe-access-inline

# CLI
npm install -g @safe-access-inline/cli
```

## Quick Example

```php
$accessor = SafeAccess::from('{"user": {"name": "Ana"}, "items": [{"price": 10}, {"price": 50}]}');
$accessor->get('user.name');              // "Ana"
$accessor->get('user.email', 'N/A');      // "N/A" — never throws
$accessor->get('items.*.price');          // [10, 50] — wildcard
$accessor->get('items[?price>20].price'); // [50] — filter
```

## Packages

| Package                                                 | CI                                                                                                                                                                                    | Version                                                                                                                                                            |
| ------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| [`@safe-access-inline/safe-access-inline`](packages/js) | [![JS CI](https://github.com/felipesauer/safe-access-inline/actions/workflows/js-ci.yml/badge.svg)](https://github.com/felipesauer/safe-access-inline/actions/workflows/js-ci.yml)    | [![npm](https://img.shields.io/npm/v/@safe-access-inline/safe-access-inline.svg)](https://www.npmjs.com/package/@safe-access-inline/safe-access-inline)            |
| [`safe-access-inline/safe-access-inline`](packages/php) | [![PHP CI](https://github.com/felipesauer/safe-access-inline/actions/workflows/php-ci.yml/badge.svg)](https://github.com/felipesauer/safe-access-inline/actions/workflows/php-ci.yml) | [![packagist](https://img.shields.io/packagist/v/safe-access-inline/safe-access-inline.svg)](https://packagist.org/packages/safe-access-inline/safe-access-inline) |
| [`@safe-access-inline/cli`](packages/cli)               | [![CLI CI](https://github.com/felipesauer/safe-access-inline/actions/workflows/cli-ci.yml/badge.svg)](https://github.com/felipesauer/safe-access-inline/actions/workflows/cli-ci.yml) | [![npm](https://img.shields.io/npm/v/@safe-access-inline/cli.svg)](https://www.npmjs.com/package/@safe-access-inline/cli)                                          |

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for development setup, coding standards, and commit conventions.

## Long-Running Environments

Internal caches (path parser, plugin registry, audit logger) use static state for performance.
In long-running processes — FrankenPHP, RoadRunner, SSR Node servers — call `SafeAccess.resetAll()`
between requests to avoid stale data.

## Documentation

> **Full guides, API reference, plugins, security, and architecture:**
> [safe-access-inline docs →](https://felipesauer.github.io/safe-access-inline/)

## License

[MIT](LICENSE) © Felipe Sauer
