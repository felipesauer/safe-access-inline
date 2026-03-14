---
agent: agent
tools:
    - codebase
    - terminal
    - githubRepo
description: Performs a complete, critical and professional audit of the safe-access-inline monorepo (PHP + JS/TS), analyzing code quality, architecture, performance, security, naming, documentation, tests and CI/CD.
---

# 🔍 Full Codebase Audit — safe-access-inline

> **Execute every step in order. Do not skip any. Do not ask for confirmation between steps — act autonomously and present the full report at the end.**

---

## Context

You are acting as a **Senior Software Engineer and Open-Source Library Auditor** with 15+ years of experience in PHP and JavaScript/TypeScript ecosystems. Your speciality is deep, production-grade code reviews for libraries following modern standards:

- **PHP:** PSR-4, PSR-12, PHP-CS-Fixer, PHPStan level 9, Pest, PHP 8.2+
- **JS/TS:** ESLint flat config, Prettier, TypeScript strict, Vitest, tsup, ESM/CJS dual output
- **Monorepo:** release-please, Husky, lint-staged, Conventional Commits, split-packages workflow
- **References:** lodash, dot-prop, get-value, ramda, Illuminate/Support (Laravel), Symfony components

This is a **monorepo** with three packages:

- `packages/php` — PHP library published to Packagist
- `packages/js` — TypeScript/JS library published to npm
- `packages/cli` — standalone CLI tool that wraps the JS library

**Core feature:** safe nested data access using dot-notation paths with support for:
wildcards (`users.*.name`), filters (`items[?price>100]`), recursive descent (`..name`), immutable write operations (`set`, `remove`, `merge`), **10 data formats** (Array, Object, JSON, NDJSON, XML, YAML, TOML, INI, CSV, ENV), plugin system, auto-detection.

**Additional capabilities (all with parity between PHP and JS/TS):**

- **Readonly mode** — `deepFreeze`-backed immutability with `ReadonlyViolationError` on write attempts
- **JSON Patch** — RFC 6902 `diff` / `applyPatch` operations
- **Data masking** — configurable `MaskPattern` to redact sensitive fields
- **Security subsystem** — `SecurityGuard` (prototype-pollution prevention), `SecurityOptions` (maxDepth / maxPayloadBytes / maxKeys), `SecurityPolicy` presets (`STRICT` / `PERMISSIVE` / global), `CsvSanitizer` (CSV injection), `IpRangeChecker` (SSRF prevention), `AuditEmitter` / `AuditLogger` (structured event log)
- **Schema validation** — adapter pattern supporting Zod, Valibot, Yup (JS) and JsonSchema, Symfony Validator (PHP); `SchemaRegistry` for a project-wide default adapter
- **Framework integrations** — NestJS module + provider (JS), Vite plugin (JS), Laravel Facade + Service Provider (PHP), Symfony Bundle (PHP)
- **File & URL I/O** — `IoLoader` (`readFileSync`, `readFile`, `fetchUrl`) with path-traversal protection and SSRF guards
- **File watching** — `watchFile` API for reactive re-parsing on file changes
- **Path cache** — `PathCache` for parsed-segment memoisation
- **Deep merger** — `deepMerge` utility used internally by `merge()`

---

## Step 1 — Map the full project structure

Read and list all files and directories recursively:

```
packages/js/src/
packages/js/src/core/
packages/js/src/accessors/
packages/js/src/contracts/
packages/js/src/exceptions/
packages/js/src/integrations/
packages/js/src/plugins/
packages/js/src/schema-adapters/
packages/js/src/types/
packages/js/tests/
packages/js/benchmarks/
packages/php/src/
packages/php/src/Core/
packages/php/src/Accessors/
packages/php/src/Contracts/
packages/php/src/Exceptions/
packages/php/src/Integrations/
packages/php/src/Plugins/
packages/php/src/SchemaAdapters/
packages/php/src/Security/
packages/php/src/Traits/
packages/php/tests/
packages/php/benchmarks/
packages/cli/src/
packages/cli/tests/
.github/workflows/
.github/prompts/
docs/
```

Also read root-level files: `package.json`, `README.md`, `CONTRIBUTING.md`, `CHANGELOG.md`, `commitlint.config.js`, `.lintstagedrc.json`, `.nvmrc`, `.editorconfig`, `release-please-config.json`, `.release-please-manifest.json`.

---

## Step 2 — Read all source files

Read **every** source file in both packages before writing any analysis:

### JS/TS (`packages/js/src/`)

- `index.ts`
- `safe-access.ts`
- `format.enum.ts`

**Core:**

- `core/abstract-accessor.ts`
- `core/dot-notation-parser.ts`
- `core/filter-parser.ts`
- `core/type-detector.ts`
- `core/plugin-registry.ts`
- `core/schema-registry.ts`
- `core/path-cache.ts`
- `core/deep-freeze.ts`
- `core/deep-merger.ts`
- `core/json-patch.ts`
- `core/io-loader.ts`
- `core/file-watcher.ts`
- `core/security-guard.ts`
- `core/security-options.ts`
- `core/security-policy.ts`
- `core/audit-emitter.ts`
- `core/csv-sanitizer.ts`
- `core/data-masker.ts`
- `core/ip-range-checker.ts`

**Contracts:**

- `contracts/accessor.interface.ts`
- `contracts/readable.interface.ts`
- `contracts/writable.interface.ts`
- `contracts/transformable.interface.ts`
- `contracts/schema-adapter.interface.ts`

**Accessors:**

- `accessors/array.accessor.ts`
- `accessors/object.accessor.ts`
- `accessors/json.accessor.ts`
- `accessors/ndjson.accessor.ts`
- `accessors/xml.accessor.ts`
- `accessors/yaml.accessor.ts`
- `accessors/toml.accessor.ts`
- `accessors/ini.accessor.ts`
- `accessors/csv.accessor.ts`
- `accessors/env.accessor.ts`

**Exceptions:**

- `exceptions/accessor.error.ts`
- `exceptions/invalid-format.error.ts`
- `exceptions/path-not-found.error.ts`
- `exceptions/unsupported-type.error.ts`
- `exceptions/security.error.ts`
- `exceptions/readonly-violation.error.ts`
- `exceptions/schema-validation.error.ts`

**Plugins:**

- `plugins/js-yaml.parser.ts`
- `plugins/js-yaml.serializer.ts`
- `plugins/smol-toml.parser.ts`
- `plugins/smol-toml.serializer.ts`

**Schema adapters:**

- `schema-adapters/zod.adapter.ts`
- `schema-adapters/valibot.adapter.ts`
- `schema-adapters/yup.adapter.ts`

**Framework integrations:**

- `integrations/nestjs.ts`
- `integrations/vite.ts`

**Types:**

- `types/deep-paths.ts`

**CLI (`packages/cli/src/`):**

- `cli.ts`

**Config & tests:**

- All test files in `packages/js/tests/`
- All test files in `packages/cli/tests/`
- All benchmark files in `packages/js/benchmarks/`
- `packages/js/tsconfig.json`
- `packages/js/eslint.config.js`
- `packages/js/.prettierrc`
- `packages/js/vitest.config.ts`
- `packages/js/package.json`
- `packages/cli/package.json`
- `packages/cli/tsconfig.json`

### PHP (`packages/php/src/`)

- `SafeAccess.php`

**Core:**

- `Core/AbstractAccessor.php`
- `Core/DotNotationParser.php`
- `Core/FilterParser.php`
- `Core/TypeDetector.php`
- `Core/PluginRegistry.php`
- `Core/SchemaRegistry.php`
- `Core/PathCache.php`
- `Core/DeepMerger.php`
- `Core/JsonPatch.php`
- `Core/IoLoader.php`
- `Core/FileWatcher.php`

**Contracts:**

- `Contracts/AccessorInterface.php`
- `Contracts/ReadableInterface.php`
- `Contracts/WritableInterface.php`
- `Contracts/TransformableInterface.php`
- `Contracts/ParserPluginInterface.php`
- `Contracts/SerializerPluginInterface.php`
- `Contracts/SchemaAdapterInterface.php`
- `Contracts/SchemaValidationIssue.php`
- `Contracts/SchemaValidationResult.php`

**Accessors:**

- `Accessors/ArrayAccessor.php`
- `Accessors/ObjectAccessor.php`
- `Accessors/JsonAccessor.php`
- `Accessors/NdjsonAccessor.php`
- `Accessors/XmlAccessor.php`
- `Accessors/YamlAccessor.php`
- `Accessors/TomlAccessor.php`
- `Accessors/IniAccessor.php`
- `Accessors/CsvAccessor.php`
- `Accessors/EnvAccessor.php`

**Enums:**

- `Enums/AccessorFormat.php`

**Exceptions:**

- `Exceptions/AccessorException.php`
- `Exceptions/InvalidFormatException.php`
- `Exceptions/PathNotFoundException.php`
- `Exceptions/UnsupportedTypeException.php`
- `Exceptions/SecurityException.php`
- `Exceptions/ReadonlyViolationException.php`
- `Exceptions/SchemaValidationException.php`

**Security subsystem:**

- `Security/SecurityGuard.php`
- `Security/SecurityOptions.php`
- `Security/SecurityPolicy.php`
- `Security/CsvSanitizer.php`
- `Security/DataMasker.php`
- `Security/AuditLogger.php`

**Schema adapters:**

- `SchemaAdapters/JsonSchemaAdapter.php`
- `SchemaAdapters/SymfonyValidatorAdapter.php`

**Framework integrations:**

- `Integrations/LaravelFacade.php`
- `Integrations/LaravelServiceProvider.php`
- `Integrations/SafeAccessBundle.php`
- `Integrations/SymfonyIntegration.php`
- `Integrations/helpers.php`

**Plugins:**

- `Plugins/` (all files — `DeviumTomlParser.php`, `DeviumTomlSerializer.php`, `NativeYamlParser.php`, `NativeYamlSerializer.php`, `SymfonyYamlParser.php`, `SymfonyYamlSerializer.php`)

**Traits:**

- `Traits/HasFactory.php`
- `Traits/HasTransformations.php`
- `Traits/HasWildcardSupport.php`
- `Traits/HasArrayOperations.php`

**Config & tests:**

- All test files in `packages/php/tests/`
- All benchmark files in `packages/php/benchmarks/`
- `packages/php/composer.json`
- `packages/php/phpstan.neon`
- `packages/php/.php-cs-fixer.dist.php`
- `packages/php/phpunit.xml.dist`

---

## Step 3 — Read CI/CD and tooling configuration

Read all files in `.github/workflows/` (`php-ci.yml`, `js-ci.yml`, `docs-ci.yml`, `release.yml`, `split-packages.yml`) and `.github/prompts/`.

Also read `packages/cli/package.json` and `packages/cli/tsconfig.json`.

---

## Step 4 — Run analysis

After reading all files, perform the audit across every axis below. For **every problem found**, include:

- 📍 **File + line number** (exact location)
- ❌ **Problem**: What is wrong and why
- 💥 **Impact**: Runtime risk / DX degradation / maintenance burden / security
- ✅ **Solution**: Show a `BEFORE` and `AFTER` code block with the fix

Pay particular attention to the following subsystems that are new and critical:

**Security subsystem** (`SecurityGuard`, `SecurityOptions`, `SecurityPolicy`, `CsvSanitizer`, `DataMasker`, `IpRangeChecker` / `AuditEmitter` / `AuditLogger`):

- Prototype-pollution vectors not covered by `SecurityGuard` (e.g. `__defineGetter__`, `valueOf`)
- `assertPayloadSize` encoding correctness (`TextEncoder` vs byte length)
- CSV injection completeness — does the sanitiser cover all Excel/Google Sheets prefix chars (`=`, `+`, `-`, `@`, `\t`, `\r`, `\n`)?
- SSRF protection — are all RFC 1918 / loopback / link-local ranges covered by `IpRangeChecker`? IPv6 edge cases?
- `AuditEmitter` / `AuditLogger`: event coverage gaps (are all sensitive operations emitting events?), listener memory-leak risk (unbounded array)
- `STRICT_POLICY` / `PERMISSIVE_POLICY` defaults — are they sensible for a library (not an app)?
- Static global state (`globalPolicy`, `PathCache`, `PluginRegistry`) — thread-safety / test-isolation risks

**Readonly / Immutability** (`deepFreeze`, `ReadonlyViolationError`):

- Does `deepFreeze` cover `prototype` and `__proto__` properties?
- Is `ReadonlyViolationError` thrown consistently for all write operations (`set`, `remove`, `merge`, `applyPatch`)?
- `cloneWithState` propagation — are cloned accessors correctly restoring the readonly flag?

**JSON Patch** (`json-patch.ts` / `JsonPatch.php`):

- RFC 6902 compliance: are all six operations (`add`, `remove`, `replace`, `move`, `copy`, `test`) implemented?
- `diff` correctness on deeply nested + array structures
- `applyPatch` atomicity — does a failed `test` operation roll back the entire patch?

**Schema validation** (`SchemaRegistry`, adapters):

- Adapter contract completeness — does `SchemaValidationResult` expose enough context (path, message, code) for actionable errors?
- `SchemaRegistry` global singleton — test-isolation, default-adapter leaking between test suites
- Error messages: are `SchemaValidationError` details surfaced or swallowed?

**Framework integrations** (`nestjs.ts`, `vite.ts`, `LaravelServiceProvider.php`, `SafeAccessBundle.php`):

- NestJS: is `SafeAccessModule` marked `@Global()`? Should it be? DI scope (singleton vs request-scoped)?
- Vite plugin: does `loadConfig` correctly handle async config loading? Hot reload edge cases?
- Laravel Service Provider: deferred vs eager binding — is the facade correctly resolved?
- Symfony Bundle: extension class naming conventions (PSR-4, bundle naming), DI tag correctness

**CLI** (`packages/cli/src/cli.ts`):

- Input sanitisation — are file paths from argv validated against allowed directories?
- Error exit codes — are all failure modes returning non-zero exit codes?
- Output format correctness — JSON/YAML output encoding, special characters
- Dependency on `packages/js` — is it via a proper workspace dependency, not a relative `../../`?

**Path Cache** (`PathCache`):

- Cache eviction strategy — unbounded growth?
- Cache key collisions — is the key only the raw path string, or does it include format context?

**Deep Merger** (`deepMerge`):

- Prototype chain handling — does a merge of a user-controlled object allow prototype pollution?
- Array merge strategy — replace vs concat; is it configurable?

**NDJSON accessor** (`NdjsonAccessor`):

- Edge cases: empty lines, trailing newlines, invalid JSON on a single line vs a valid line — does it throw or skip?
- `get` on NDJSON: are numeric keys used to address rows?

**IO Loader** (`io-loader.ts` / `IoLoader.php`):

- Path traversal: does `assertPathWithinAllowedDirs` cover symlink resolution?
- `fetchUrl` / remote load: are redirects followed? Are redirect targets re-validated against SSRF guards?
- Timeout enforcement on `fetchUrl`

**Plugin system** (`PluginRegistry`):

- Static registry: what happens if two different tests or library consumers register conflicting plugins for the same format key? Is there an override warning?
- PHP plugins: `NativeYamlParser` requires the `yaml` extension — is there a graceful fallback or a clear error message?

---

## Step 5 — Deliver the audit report

Structure the full report using the exact sections below:

---

### 📋 Executive Summary

- Overall score: **X/10**
- One paragraph summarising the state of the library
- Quick verdict table:

| Category                 | Score | Status   |
| ------------------------ | ----- | -------- |
| Architecture & Structure | /10   | 🟢/🟡/🔴 |
| Naming & Conventions     | /10   | 🟢/🟡/🔴 |
| Code Style & Formatting  | /10   | 🟢/🟡/🔴 |
| Type Safety & Contracts  | /10   | 🟢/🟡/🔴 |
| Tests & Coverage         | /10   | 🟢/🟡/🔴 |
| Performance              | /10   | 🟢/🟡/🔴 |
| Security                 | /10   | 🟢/🟡/🔴 |
| CI/CD & DevOps           | /10   | 🟢/🟡/🔴 |
| Documentation            | /10   | 🟢/🟡/🔴 |
| API Ergonomics           | /10   | 🟢/🟡/🔴 |
| Framework Integrations   | /10   | 🟢/🟡/🔴 |
| CLI                      | /10   | 🟢/🟡/🔴 |

---

### ✅ Strengths

List what is genuinely good about the project. Be specific and reference real files/patterns.

---

### 🚨 Critical Bugs & Security Issues

Issues that can cause runtime failures, data corruption, security vulnerabilities or incorrect results. Use the format:

#### [CRIT-001] Title

- 📍 File: `path/to/file.ts`, line X
- ❌ Problem: ...
- 💥 Impact: ...
- ✅ Fix:

```language
// BEFORE
...

// AFTER
...
```

---

### ⚠️ Quality & Maintainability Problems

Code smells, anti-patterns, dead code, redundant logic, high cyclomatic complexity, violated SRP, poor abstractions. Same format as above, prefix `[QUAL-NNN]`.

---

### 🏗️ Architecture & Design Issues

Structural problems: wrong abstractions, missing interfaces, broken LSP/ISP, static state risks, class coupling, plugin system flaws. Prefix `[ARCH-NNN]`.

---

### 🏷️ Naming & Style Issues

Inconsistent naming (camelCase vs snake_case vs PascalCase), misleading names, non-English identifiers, abbreviations, style violations (PSR-12, ESLint, Prettier). Prefix `[STYLE-NNN]`.

---

### ⚡ Performance Opportunities

Concrete, measurable improvements. For each suggestion include the benchmark scenario to verify it. Prefix `[PERF-NNN]`.

Example format:

#### [PERF-001] Title

- 📍 File: `...`
- ❌ Problem: `structuredClone` is called twice in `merge()` — once inside `deepMerge()` and once at the call site.
- 💥 Impact: 2× unnecessary deep clone for every `merge()` call.
- ✅ Fix: (BEFORE/AFTER)
- 🧪 Benchmark to validate: `cd packages/js && npm run bench`

---

### 🆚 Comparison with Industry References

Compare this library against:

| Feature / Library      | safe-access-inline | lodash.get | dot-prop | get-value | adrot/dot | data-get (PHP) |
| ---------------------- | ------------------ | ---------- | -------- | --------- | --------- | -------------- |
| Dot notation           | ✅                 | ✅         | ✅       | ✅        | ✅        | ✅             |
| Wildcard               | ...                | ...        | ...      | ...       | ...       | ...            |
| Filters                | ...                | ...        | ...      | ...       | ...       | ...            |
| Recursive descent      | ...                | ...        | ...      | ...       | ...       | ...            |
| Immutable writes       | ...                | ...        | ...      | ...       | ...       | ...            |
| Readonly mode          | ...                | ...        | ...      | ...       | ...       | ...            |
| Multi-format support   | ...                | ...        | ...      | ...       | ...       | ...            |
| NDJSON support         | ...                | ...        | ...      | ...       | ...       | ...            |
| JSON Patch (RFC 6902)  | ...                | ...        | ...      | ...       | ...       | ...            |
| Schema validation      | ...                | ...        | ...      | ...       | ...       | ...            |
| Security subsystem     | ...                | ...        | ...      | ...       | ...       | ...            |
| Framework integrations | ...                | ...        | ...      | ...       | ...       | ...            |
| Path cache             | ...                | ...        | ...      | ...       | ...       | ...            |
| TypeScript generics    | ...                | ...        | ...      | ...       | ...       | ...            |
| Bundle size            | ...                | ...        | ...      | ...       | ...       | ...            |

Write a paragraph on what this library does **better** and what needs improvement to compete.

---

### 📋 Prioritised Refactoring Roadmap

| Priority | ID        | Title | Effort | Impact |
| -------- | --------- | ----- | ------ | ------ |
| 🔴 High  | CRIT-001  | ...   | S/M/L  | High   |
| 🟡 Med   | QUAL-002  | ...   | S/M/L  | Med    |
| 🟢 Low   | STYLE-003 | ...   | S/M/L  | Low    |

---
