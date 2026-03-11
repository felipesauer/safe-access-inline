# Changelog

This is the root changelog for the **safe-access-inline** monorepo.

For per-package changelogs managed by [release-please](https://github.com/googleapis/release-please), see:

- [PHP Package Changelog](packages/php/CHANGELOG.md) — `safe-access-inline/safe-access-inline`
- [JS/TS Package Changelog](packages/js/CHANGELOG.md) — `@safe-access-inline/core`

## Initial Development

### Added

- **PHP Package** — 9 built-in accessors (Array, Object, JSON, XML, YAML, TOML, INI, CSV, ENV), `SafeAccess` facade, `DotNotationParser`, `TypeDetector`, immutable `set()`/`remove()`, cross-format transformations, full interface contracts
- **JS/TS Package** — feature parity with PHP, zero external dependencies, dual ESM/CJS output via tsup, full TypeScript types
- **CI/CD** — GitHub Actions for PHP (8.2/8.3/8.4) and JS (Node 18/20/22), release-please for automated versioning
- **Documentation** — architecture guide, getting started guides, API references for both languages
