# Changelog

All notable changes to this project are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

Per-package changelogs are maintained automatically by [release-please](https://github.com/googleapis/release-please):

- [PHP Package Changelog](packages/php/CHANGELOG.md) — `safe-access-inline/safe-access-inline`
- [JS/TS Package Changelog](packages/js/CHANGELOG.md) — `@safe-access-inline/safe-access-inline`
- [CLI Package Changelog](packages/cli/CHANGELOG.md) — `@safe-access-inline/cli`

## [Unreleased]

### Documentation

- **JS** — Fixed branch coverage to 100% (`XmlAccessor` — non-null assertion on always-captured regex group)
- **PHP + JS** — Fixed CSV `'prefix'` mode description: prepends single quote `'`, not a tab
- **JS** — Fixed `CsvMode.PREFIX` JSDoc to reflect single-quote prefix
- **JS** — Fixed `deepFreeze` usage: exported standalone function, not a `SafeAccess` static method
- **JS** — Removed `"undefined"` from `type()` possible return values
- **JS** — Added missing `getWildcard<T>` method to JS API reference
- **JS** — Updated `toJson()` signature to include `options?: ToJsonOptions` parameter

## [0.3.1] — 2026-03-19

### Added

- **JS** — `AuditEventType`, `Format`, `PatchOperationType`, and `SegmentType` enums
- **JS** — Security subsystem under `src/security/` (SecurityPolicy, AuditEmitter, DataMasker, IpRangeChecker, CsvSanitizer, JsonSchemaAdapter)
- **JS** — Core path-resolution and serialization classes extracted into dedicated modules
- **JS** — `Config` interfaces replace hardcoded limits throughout
- **JS** — Typed interfaces for audit events, filter expressions, and JSON Patch
- **PHP** — `Config` classes replace hardcoded limits throughout
- **PHP** — PHPStan extension stubs for `devium/toml` and `symfony/yaml`
- **PHP** — Typed DTOs for structured data contracts
- **PHP** — `AbstractPlugin` base class; `SimpleXmlSerializer` extracted
- **PHP** — `PathResolver`, `SegmentParser`, and `TemplateRenderer` extracted
- **PHP** — `FileLoadOptions` DTO adopted in `fromFile`, `watchFile`, and `layerFiles`
- **PHP** — `AuditEventType`, `PatchOperationType`, and `SegmentType` enums
- **CLI** — Dependency version range relaxed to allow any compatible version

### Fixed

- **PHP** — Added `strict_types=1` and PHPDoc to all accessor classes
- **PHP** — Cleared all PHPStan baseline suppressions
- **PHP** — Improved type safety in `JsonSchemaAdapter` and `SymfonyValidatorAdapter`

## [0.3.0] — 2026-03-18

### ⚠ BREAKING CHANGES

- **JS** — `type()` now returns `"bool"` (was `"boolean"`) and `"null"` (was `"object"` for `null` values), aligning with the cross-language type vocabulary
- **PHP** — `type()` now returns `"number"` (was `"integer"` / `"double"`), `"bool"` (was `"boolean"`), and `"null"` (was `"NULL"`), aligning with the cross-language type vocabulary

### Added

- **PHP** — `class_exists` guards in all optional-dependency plugins
- **CLI** — TypeScript ESLint flat config; updated source and dependencies
- **CLI** — `@types/node` added; TypeScript type errors resolved

### Fixed

- **JS** — Prototype pollution hardening in `DeepMerger`, `DotNotationParser`, `FilterParser`, and `JsonPatch`
- **JS** — `match()` now guards against invalid regex and adds the Unicode flag
- **JS** — SSRF block list extended (Oracle cloud metadata hostname)
- **JS** — `emitAllowedDirs` audit event and post-fetch DNS rebinding guard added
- **JS** — `security.violation` audit event emitted on CSV column count mismatch
- **JS** — Audit listener errors are now isolated; watcher and Vite errors swallowed safely
- **JS** — `RangeError` thrown on audit listener overflow instead of silent `console.warn`
- **PHP** — Prototype pollution hardening in `DeepMerger`, `DotNotationParser`, `FilterParser`, and `JsonPatch`
- **PHP** — `evalMatch` hardened against PCRE delimiter injection and ReDoS
- **PHP** — Oracle cloud metadata hostname added to SSRF block list
- **PHP** — `security.violation` audit event emitted when `allowedDirs` is unconfigured
- **PHP** — PHPStan baseline regenerated (core profile, no optional deps)
- **PHP + JS** — Custom accessor cap lowered to 50; `resetAll()` now clears them
- **CLI** — `allowAnyPath` passed to `fromFileSync` for user-supplied paths

### Performance Improvements

- **JS** — Wildcard `RegExp` patterns cached in `DataMasker`; LRU eviction fixed in `PathCache`
- **JS** — Eliminated `slice` allocations and `structuredClone` in `DotNotationParser`
- **JS** — `TextEncoder` instance hoisted to module scope
- **PHP** — Eliminated O(n²) `array_slice` allocations in `DotNotationParser`
- **PHP** — Forbidden-key lookup replaced with hash map; LRU fixed in `PathCache`

## [0.2.3] — 2026-03-17

### Added

- **JS** — Built-in JSON Schema validation adapter (`JsonSchemaAdapter`)
- **JS** — `JsonPatchTestFailedError` exception class
- **JS** — Optional-require utility for lazy peer-dependency loading
- **JS** — Security policy, audit emitter, and feature wiring
- **PHP** — `HttpClientInterface` and `CurlHttpClient`
- **PHP** — `JsonPatchTestFailedException`
- **PHP** — Security policy, audit logger, and JS feature parity

### Fixed

- **JS** — IPv4-mapped IPv6 hex pairs always parsed correctly in `assertSafeUrl`

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
