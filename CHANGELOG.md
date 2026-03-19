# Changelog

All notable changes to this project are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

Per-package changelogs are maintained automatically by [release-please](https://github.com/googleapis/release-please):

- [PHP Package Changelog](packages/php/CHANGELOG.md) — `safe-access-inline/safe-access-inline`
- [JS/TS Package Changelog](packages/js/CHANGELOG.md) — `@safe-access-inline/safe-access-inline`
- [CLI Package Changelog](packages/cli/CHANGELOG.md) — `@safe-access-inline/cli`

## [Unreleased]

## [0.2.2] — 2026-03-14

### Added

- **PHP + JS** — Security hardening (SecurityGuard, SecurityPolicy, SSRF prevention, CsvSanitizer, DataMasker)
- **PHP + JS** — Schema validation (SchemaAdapterInterface, Zod/Valibot/Yup adapters for JS, Symfony/JsonSchema adapters for PHP)
- **PHP + JS** — NDJSON format support with auto-detection
- **PHP + JS** — IoLoader (file + HTTPS-only URL loading), FileWatcher, JsonPatch (RFC 6902)
- **PHP + JS** — Advanced path expressions (multi-index, slice, bracket notation, filter functions)
- **PHP + JS** — Deep merge, deep freeze, array operations (push, pop, filterAt, mapAt, sortAt)
- **PHP** — Laravel ServiceProvider + Facade, Symfony Bundle integration
- **JS** — NestJS module + Vite config plugin integration
- **JS** — LRU PathCache for segment caching

### Fixed

- **JS** — Enforce YAML `JSON_SCHEMA` to prevent unsafe type deserialization
- **JS** — Reject DOCTYPE/ENTITY in XML parser to prevent XXE

## [0.2.1] — 2026-03-13

### Added

- **PHP + JS** — FilterParser with expression parsing and evaluation
- **JS** — `Format` enum and `SafeAccess.from()` unified factory with typed overloads
- **PHP** — `AccessorFormat` enum and `SafeAccess::from()` unified factory

## [0.2.0] — 2026-03-12

### Added

- **PHP + JS** — Plugin system (`PluginRegistry`, `ParserPluginInterface`, `SerializerPluginInterface`)
- **PHP** — Shipped plugins: SymfonyYamlParser, SymfonyYamlSerializer, NativeYamlParser, DeviumTomlParser
- **PHP + JS** — `toYaml()`, `toXml()`, and `transform()` cross-format serialization
- **PHP + JS** — Wildcard (`*`) and recursive descent (`..key`) path expressions

## [0.1.0] — 2026-03-10

### Added

- **PHP Package** — 9 built-in accessors (Array, Object, JSON, XML, YAML, TOML, INI, CSV, ENV), `SafeAccess` facade, `DotNotationParser`, `TypeDetector`, immutable `set()`/`remove()`, cross-format transformations, full interface contracts
- **JS/TS Package** — feature parity with PHP, zero external dependencies, dual ESM/CJS output via tsup, full TypeScript types
- **CI/CD** — GitHub Actions for PHP (8.2/8.3/8.4) and JS (Node 24), release-please for automated versioning
- **Documentation** — architecture guide, getting started guides, API references for both languages
- **Community** — `SECURITY.md`, `CODE_OF_CONDUCT.md` (Contributor Covenant v2.1), `CONTRIBUTING.md`

[Unreleased]: https://github.com/felipesauer/safe-access-inline/compare/js-v0.2.2...HEAD
[0.2.2]: https://github.com/felipesauer/safe-access-inline/compare/js-v0.2.1...js-v0.2.2
[0.2.1]: https://github.com/felipesauer/safe-access-inline/compare/js-v0.2.0...js-v0.2.1
[0.2.0]: https://github.com/felipesauer/safe-access-inline/compare/js-v0.1.0...js-v0.2.0
[0.1.0]: https://github.com/felipesauer/safe-access-inline/releases/tag/js-v0.1.0
