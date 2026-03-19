# Changelog

## Unreleased

### ⚠ BREAKING CHANGES

- **js:** `type()` now returns `"bool"` instead of `"boolean"` and `"null"` instead of `"object"` for null values, aligning the cross-language type vocabulary (`"string"`, `"number"`, `"bool"`, `"array"`, `"object"`, `"null"`, `"undefined"`).

## [0.3.1](https://github.com/felipesauer/safe-access-inline/compare/js-v0.3.0...js-v0.3.1) (2026-03-19)


### Features

* **js:** add AuditEventType, Format, PatchOperationType, and SegmentType enums ([4c67586](https://github.com/felipesauer/safe-access-inline/commit/4c67586832f62de1b61d7d0f7c63207e0986d0ad))
* **js:** add security subsystem under packages/js/src/security ([f2fcf5f](https://github.com/felipesauer/safe-access-inline/commit/f2fcf5f44e28d2d4ec9b733a78673435d4c0fa02))
* **js:** extract core path-resolution and serialization classes ([f5a0a19](https://github.com/felipesauer/safe-access-inline/commit/f5a0a19147347f214d38145ea0604fc032c8b9fe))
* **js:** introduce Config interfaces to replace hardcoded limits ([edf5a58](https://github.com/felipesauer/safe-access-inline/commit/edf5a58d004e8670da85b7fdec8f5cc2ffaa5c52))
* **js:** introduce typed interfaces for audit events, filter expressions, and JSON Patch ([a2139be](https://github.com/felipesauer/safe-access-inline/commit/a2139beec72a0cf9f5838fb9c3e6d07b35396e2a))

## [0.3.0](https://github.com/felipesauer/safe-access-inline/compare/js-v0.2.3...js-v0.3.0) (2026-03-18)


### ⚠ BREAKING CHANGES

* **js:** type() now returns "bool" instead of "boolean" and "null" instead of "object" for null values, aligning cross-language type vocabulary ("string", "number", "bool", "array", "object", "null", "undefined").

### Features

* **js:** normalize type() vocabulary, atomic JSON Patch, testing entry and security enhancements ([688408d](https://github.com/felipesauer/safe-access-inline/commit/688408d65e781f94fa0f5767c99bdc3cc39bfbc8))


### Bug Fixes

* **js:** block Oracle metadata hostname and cap HTTP response payload size ([f14e205](https://github.com/felipesauer/safe-access-inline/commit/f14e205e18b01805cace0002bb8ccb309ed89f8b))
* **js:** emit allowedDirs audit event and add post-fetch DNS rebinding guard ([9094cea](https://github.com/felipesauer/safe-access-inline/commit/9094cea584565d606f6da3ce33cbcc500e308b19))
* **js:** emit security.violation audit event on CSV column count mismatch ([94c8b81](https://github.com/felipesauer/safe-access-inline/commit/94c8b81683eb6bfb3649af822651e4b6da44921a))
* **js:** guard match() against invalid regex and add unicode flag ([e87a680](https://github.com/felipesauer/safe-access-inline/commit/e87a680b48062b9b51a65adaee968d9adca2dbbe))
* **js:** harden deep-merger, json-patch, filter-parser against prototype pollution ([ab52daf](https://github.com/felipesauer/safe-access-inline/commit/ab52daf66209f404be24ac7f647477c0d1be7ced))
* **js:** isolate errors in audit-emitter, file-watcher, and vite integration ([a845ca9](https://github.com/felipesauer/safe-access-inline/commit/a845ca9a4018c9ba3207fa510b36e0db5e448a27))
* **js:** resolve CRIT-001-005, ARCH-001-003, PERF-001-002, QUAL-001 ([506526f](https://github.com/felipesauer/safe-access-inline/commit/506526f3837207aa456c466d1e4c321a07d2415e))
* **js:** throw RangeError on audit listener overflow instead of warning ([2f1a36a](https://github.com/felipesauer/safe-access-inline/commit/2f1a36a7614f341ed20ab9ccb563855149116c06))
* **php,js:** cap custom accessors at 50 and clear on resetAll ([6054b7c](https://github.com/felipesauer/safe-access-inline/commit/6054b7cbcab6a1d4e9242b76a3087a6de791661c))


### Performance Improvements

* **js:** cache compiled wildcard RegExp in data-masker and fix LRU in PathCache ([bc12b07](https://github.com/felipesauer/safe-access-inline/commit/bc12b0752a62baedf32025d4c15c3824abd0510a))
* **js:** eliminate slice allocations and replace structuredClone in DotNotationParser ([a58f532](https://github.com/felipesauer/safe-access-inline/commit/a58f532ed82ce23194a99e631bda34db0b052dd3))
* **js:** hoist TextEncoder instance to module scope ([395e712](https://github.com/felipesauer/safe-access-inline/commit/395e712c0d70c839158fc64c4d32a5dc23bd045d))

## [0.2.3](https://github.com/felipesauer/safe-access-inline/compare/js-v0.2.2...js-v0.2.3) (2026-03-17)

### Features

- **js:** add built-in JSON Schema validation adapter ([68629b4](https://github.com/felipesauer/safe-access-inline/commit/68629b4230d0926aa8beaf958d53351e73f660a9))
- **js:** add JsonPatchTestFailedError ([b8b0bdc](https://github.com/felipesauer/safe-access-inline/commit/b8b0bdcf52fa0dd51011ac426f0cc5990e99ef0a))
- **js:** add optional-require utility for lazy peer dep loading ([12ec436](https://github.com/felipesauer/safe-access-inline/commit/12ec43682262446990f4cb126be256500f13c806))
- **js:** add security policy, audit emitter, and feature wiring ([64bbfa0](https://github.com/felipesauer/safe-access-inline/commit/64bbfa078b52113e043c32b09b264a741368329a))

### Bug Fixes

- add missing v8 ignore comments for clarity in optionalRequire function ([a1c239f](https://github.com/felipesauer/safe-access-inline/commit/a1c239f8ada4f7df9f1985301116f003b522c4a4))
- **js:** always parse hex pairs for IPv4-mapped IPv6 in assertSafeUrl ([8ca9967](https://github.com/felipesauer/safe-access-inline/commit/8ca9967e5e7812bb123be7a8fbe88c13c6a5d57a))

## [0.2.2](https://github.com/felipesauer/safe-access-inline/compare/js-v0.2.1...js-v0.2.2) (2026-03-14)

### Features

- **js:** add array operation tests for push, pop, filterAt, mapAt, sortAt and more ([e95a136](https://github.com/felipesauer/safe-access-inline/commit/e95a1360acc0924e399e64ac0246259c9d6ab757))
- **js:** add CsvSanitizer with prefix/strip/error/none modes for export injection prevention ([8c26437](https://github.com/felipesauer/safe-access-inline/commit/8c26437ea128e3aa150866a4417ef8d4833885fc))
- **js:** add deepFreeze&lt;T&gt;() with cycle detection and ReadonlyViolationError ([ec41fec](https://github.com/felipesauer/safe-access-inline/commit/ec41fecfc0422a0cf592950375290cafbfb29a86))
- **js:** add deepMerge() with last-wins semantics and recursive object merging ([fe3f4e7](https://github.com/felipesauer/safe-access-inline/commit/fe3f4e734420120c56cb189a6ceae739044b7c38))
- **js:** add FileWatcher with fs.watch() and 100ms debounce (Node.js only) ([7074c53](https://github.com/felipesauer/safe-access-inline/commit/7074c5367f608fa8c867256db432e9abf851e350))
- **js:** add framework integration tests for NestJS and Vite plugin ([7e9ad41](https://github.com/felipesauer/safe-access-inline/commit/7e9ad41d09364863112dff9fc0a24d8ad2a66ea7))
- **js:** add IoLoader with readFile, readFileSync and HTTPS-only fetchUrl ([c7f8cec](https://github.com/felipesauer/safe-access-inline/commit/c7f8cec3f3a7f1794de5cec6c48d39092c2ab37b))
- **js:** add JsonPatch with diff() and immutable applyPatch() per RFC 6902 ([37797f7](https://github.com/felipesauer/safe-access-inline/commit/37797f7eef572c1acc303a22391862d04ae83c5a))
- **js:** add length(), match() and keys() filter functions to FilterParser ([e58504c](https://github.com/felipesauer/safe-access-inline/commit/e58504cdf449bd4cc5f2c425b30099d871980486))
- **js:** add multi-index, slice, bracket notation and getBySegments to parser ([56dd8f1](https://github.com/felipesauer/safe-access-inline/commit/56dd8f159a8d4685cb6da416cad609dc4549a938))
- **js:** add NdjsonAccessor and Format.Ndjson enum value ([c7c5763](https://github.com/felipesauer/safe-access-inline/commit/c7c57636beec0c036af3f71980f2334c82f0394b))
- **js:** add NestJS SafeAccessModule.forRoot() and Vite config injection plugin ([dd2982c](https://github.com/felipesauer/safe-access-inline/commit/dd2982c49d315ef5a8b17281393aff5856f373b3))
- **js:** add SchemaAdapterInterface, SchemaValidationError and SchemaRegistry ([eb37bcc](https://github.com/felipesauer/safe-access-inline/commit/eb37bcc50290a1f7b35023ed72bfa8429d7d7329))
- **js:** add SecurityError exception class for security violations ([e106fd0](https://github.com/felipesauer/safe-access-inline/commit/e106fd06d2a23e9a1f04a4b1161142592ef88184))
- **js:** add SecurityGuard with FORBIDDEN_KEYS set and assertSafeKey() ([57561fe](https://github.com/felipesauer/safe-access-inline/commit/57561fe16f2596ecc980497936c3163e0e00f7e6))
- **js:** add SecurityOptions with maxDepth, maxPayloadBytes and maxKeys limits ([bea9d75](https://github.com/felipesauer/safe-access-inline/commit/bea9d755808aeb54da40a638dd599483a35d1626))
- **js:** add SecurityPolicy with SSRF prevention, DataMasker and IpRangeChecker ([afabd1d](https://github.com/felipesauer/safe-access-inline/commit/afabd1d81c0aa676f425740dcb1169e5b3d6b641))
- **js:** add ZodSchemaAdapter, ValibotSchemaAdapter and YupSchemaAdapter ([e8fe2e7](https://github.com/felipesauer/safe-access-inline/commit/e8fe2e7a08cd63c03c22bd0137651632ccc408a2))
- **js:** export all new types, classes and utilities from package index ([a3033e7](https://github.com/felipesauer/safe-access-inline/commit/a3033e725a8a437bac90f3f791002d3bec6fa2b4))
- **js:** extend AbstractAccessor with all roadmap feature methods (phases 1-12) ([3cd6873](https://github.com/felipesauer/safe-access-inline/commit/3cd6873af69e661341c98cf138f8ff186adfa77f))
- **js:** extend SafeAccess facade with fromFile, layer, fromUrl and watchFile ([2e2dc60](https://github.com/felipesauer/safe-access-inline/commit/2e2dc60b2077b66855cb2022b78b41ca6fbab224))
- **js:** update TypeDetector to support NDJSON format auto-detection ([bcfe6d9](https://github.com/felipesauer/safe-access-inline/commit/bcfe6d9c674c00e0a024aeb0c6b0f1326d85c34b))

### Bug Fixes

- **js:** add @types/node to devDependencies for DTS build ([e4dd545](https://github.com/felipesauer/safe-access-inline/commit/e4dd545262f1359b46477780371adce4b83d7366))
- **js:** add missing getGlobalPolicy export and imports in abstract-accessor ([b02f03d](https://github.com/felipesauer/safe-access-inline/commit/b02f03d0db76df2d932af8517ffaf7b5ee2f295d))
- **js:** enforce YAML JSON_SCHEMA to prevent unsafe type deserialization ([3900744](https://github.com/felipesauer/safe-access-inline/commit/39007441e51b96c633daa524f2f85316f1175e94))
- **js:** reject DOCTYPE and ENTITY declarations in XML parser to prevent XXE ([fd0aba9](https://github.com/felipesauer/safe-access-inline/commit/fd0aba922773a06cf3f20dc7115158ce2bd46812))

### Performance Improvements

- **js:** add LRU PathCache with 1000-entry limit for segment caching ([9250154](https://github.com/felipesauer/safe-access-inline/commit/92501543575691f54023ff6aa83e5447c007cd46))

## [0.2.1](https://github.com/felipesauer/safe-access-inline/compare/js-v0.2.0...js-v0.2.1) (2026-03-13)

### Features

- **js:** add FilterParser with expression parsing and evaluation ([598956d](https://github.com/felipesauer/safe-access-inline/commit/598956d9cf1e78f6826eebfe5a0bef3ab9a905e7))
- **js:** add Format enum and SafeAccess.from() unified factory with typed overloads ([cc50dc6](https://github.com/felipesauer/safe-access-inline/commit/cc50dc61428e1313ca8a9a986656181db5f3c53c))
- **js:** make AbstractAccessor generic with DeepPaths/ValueAtPath type inference and add merge() ([a113d82](https://github.com/felipesauer/safe-access-inline/commit/a113d827428af9bf5d6caf148c33695c249ce72b))
- **js:** refactor DotNotationParser to support filter expressions, recursive descent, and merge ([5a2287d](https://github.com/felipesauer/safe-access-inline/commit/5a2287dc6594c372db01ba4379caf3e1987b4715))

## [0.2.0](https://github.com/felipesauer/safe-access-inline/compare/js-v0.1.1...js-v0.2.0) (2026-03-13)

### ⚠ BREAKING CHANGES

- **js:** installing the package now requires js-yaml ^4.0.0 and smol-toml ^1.0.0.

### Features

- **js:** add js-yaml and smol-toml plugin adapters and export from index ([1c04f52](https://github.com/felipesauer/safe-access-inline/commit/1c04f5282ac3c46cced5115e2206e41b26f7a88a))
- **js:** add TOML auto-detection to TypeDetector ([40ace9b](https://github.com/felipesauer/safe-access-inline/commit/40ace9b15c4f511a3604244bd29a02815775d44f))
- **js:** add toToml() to TransformableInterface ([92a5da4](https://github.com/felipesauer/safe-access-inline/commit/92a5da435f7ed874ccd1bdf6c5bb13ec12bf0fa2))
- **js:** promote js-yaml and smol-toml to production dependencies ([a8eecca](https://github.com/felipesauer/safe-access-inline/commit/a8eeccabe2ac4c3ac4932a193acf45a42e302b46))

## [0.1.1](https://github.com/felipesauer/safe-access-inline/compare/js-v0.1.0...js-v0.1.1) (2026-03-12)

### Bug Fixes

- **js:** add depth limit to XML parser to prevent DoS ([5c9b1ad](https://github.com/felipesauer/safe-access-inline/commit/5c9b1ad841e764fc979da8e4d433bb9c7e79ced6))
- **js:** validate XML root element name to prevent injection ([10eca88](https://github.com/felipesauer/safe-access-inline/commit/10eca88008794139f25c63e0eb2b9a53d9ea7c4d))

## 0.1.0 (2026-03-11)

### Features

- **js:** add contracts and exception hierarchy ([e5e89f3](https://github.com/felipesauer/safe-access-inline/commit/e5e89f31ed8f4dac63b1ba3afad22668978c59a8))
- **js:** add core engine with dot notation parser and plugin registry ([d190f3a](https://github.com/felipesauer/safe-access-inline/commit/d190f3a6695cef1dd8fdbdc7044de21474882aeb))
- **js:** add format accessors for array, object, json, xml, yaml, toml, ini, csv, and env ([f61d4a5](https://github.com/felipesauer/safe-access-inline/commit/f61d4a559ebebe7ab857755f9ce58203397a1b1c))
- **js:** add SafeAccess facade and barrel export ([09c8a24](https://github.com/felipesauer/safe-access-inline/commit/09c8a24bb27a0a46f9eef67bfdd8d3c0fcb67e98))

### Bug Fixes

- add @vitest/coverage-v8 to devDependencies ([63ab54c](https://github.com/felipesauer/safe-access-inline/commit/63ab54cfd667a9c32ddf660cb229055ed3a481fb))
- update package name to match repository structure ([2bcc658](https://github.com/felipesauer/safe-access-inline/commit/2bcc6587e97d8310a3b1c4a9d17ed9da844cba24))

## Changelog

All notable changes to the **JavaScript/TypeScript** package will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).
