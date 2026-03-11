# Changelog

This is the root changelog for the **safe-access-inline** monorepo.

For per-package changelogs managed by [release-please](https://github.com/googleapis/release-please), see:

- [PHP Package Changelog](packages/php/CHANGELOG.md) — `safe-access-inline/safe-access-inline`
- [JS/TS Package Changelog](packages/js/CHANGELOG.md) — `@safe-access-inline/safe-access-inline`

## Initial Development

### Added

- **PHP Package** — 9 built-in accessors (Array, Object, JSON, XML, YAML, TOML, INI, CSV, ENV), `SafeAccess` facade, `DotNotationParser`, `TypeDetector`, immutable `set()`/`remove()`, cross-format transformations, full interface contracts
- **JS/TS Package** — feature parity with PHP, zero external dependencies, dual ESM/CJS output via tsup, full TypeScript types
- **Plugin System** — `PluginRegistry` for extensible format parsing and serialization, `ParserPluginInterface`/`SerializerPluginInterface` contracts, shipped PHP plugins (SymfonyYamlParser, SymfonyYamlSerializer, NativeYamlParser, DeviumTomlParser), `toYaml()`, `toXml()`, and `transform()` methods on both PHP and JS
- **CI/CD** — GitHub Actions for PHP (8.2/8.3/8.4) and JS (Node 18/20/22), release-please for automated versioning
- **Documentation** — architecture guide, getting started guides, API references for both languages, Plugin System documentation
- **Community** — `SECURITY.md` (vulnerability reporting policy), `CODE_OF_CONDUCT.md` (Contributor Covenant v2.1), overhauled `CONTRIBUTING.md`
