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
wildcards (`users.*.name`), filters (`items[?price>100]`), recursive descent (`..name`), immutable write operations (`set`, `remove`, `merge`), **multiple data formats** (Array, Object, JSON, NDJSON, XML, YAML, TOML, INI, CSV, ENV), plugin system, auto-detection.

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

## Step 1 — Discovery

> Complete all three phases before proceeding to Step 2. Do not begin analysis until all source files have been read.

### Phase A — Map project structure

Run the following command via terminal to discover the real project structure at audit time:

```sh
find packages/ .github/ docs/ \
  -not -path '*/vendor/*' \
  -not -path '*/node_modules/*' \
  -not -path '*/coverage/*' \
  -not -path '*/dist/*' \
  | sort
```

Also list all files at the repository root to identify every configuration file present.

### Phase B — Read all source files

Use the `codebase` tool with glob patterns to discover all files that currently exist — do not assume any specific filename.

**JS/TS:**

- All `**/*.ts` files under `packages/js/src/`
- All `**/*.ts` files under `packages/js/tests/`
- All `**/*.ts` files under `packages/js/benchmarks/`
- All `**/*.ts` files under `packages/cli/src/`
- All `**/*.ts` files under `packages/cli/tests/`
- All configuration files at the root of each package: every `package.json`, `tsconfig.json`, and `*.config.*` file present (e.g. `vitest.config.ts`, `eslint.config.js`, `.prettierrc`)

**PHP:**

- All `**/*.php` files under `packages/php/src/`
- All `**/*.php` files under `packages/php/tests/`
- All `**/*.php` files under `packages/php/benchmarks/`
- All configuration files at the root of `packages/php/`: `composer.json` and every `*.neon`, `*.xml.dist`, and `*.php` config file present (e.g. `phpstan.neon`, `phpunit.xml.dist`, `.php-cs-fixer.dist.php`)

**Repository root:**

- All configuration files present at the repository root: `package.json`, `README.md`, `CONTRIBUTING.md`, `CHANGELOG.md`, and every config file found (e.g. `.nvmrc`, `.editorconfig`, `.lintstagedrc.*`, `commitlint.config.*`, `release-please-config.json`, `.release-please-manifest.json`)

### Phase C — Read CI/CD and tooling configuration

Read **all** files currently present in `.github/workflows/` and `.github/prompts/` — discover them dynamically via the `codebase` tool; do not assume specific filenames.

---

## Step 2 — Run analysis

> **Note on class and file names:** The subsystem headings below name classes and files as they exist in the current known state of the codebase. Before analysing each subsystem, use the `codebase` tool to locate the actual files that implement that concept — names may have changed since this prompt was written. Analyse whatever you find; do not skip a subsystem because an expected filename is absent.

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

**CLI** (locate the CLI entry point discovered in Phase B):

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

**Documentation:**

- `README.md` accuracy — do all code examples match the current public API? Run each example mentally against the source to verify it would not throw.
- JSDoc / PHPDoc completeness — are all public methods and classes documented? Are parameter types, return types, and thrown exceptions declared?
- `CONTRIBUTING.md` and `CHANGELOG.md` — are they up to date and accurate relative to the current codebase?
- Inline comments — are complex algorithms (e.g. filter parser, recursive descent, prototype-pollution guard) explained where the logic is non-obvious?

**Run static analysis and tests — include full tool output in the report:**

Execute the following commands via terminal and capture their complete output:

```sh
# JS/TS
cd packages/js && npx eslint . --max-warnings=0 2>&1
cd packages/js && npx tsc --noEmit 2>&1
cd packages/js && npx vitest run --coverage 2>&1

# CLI
cd packages/cli && npx tsc --noEmit 2>&1
cd packages/cli && npx vitest run 2>&1

# PHP
cd packages/php && vendor/bin/phpstan analyse --no-progress 2>&1
cd packages/php && vendor/bin/pest --coverage --min=95 2>&1
```

For each command: report ✅ if it passes with zero warnings/errors, or ❌ with the exact output if it fails. Do not skip this step — tool failures are findings and must appear in the report.

**Test Coverage Suppression & Skipped Tests:**

Search for and evaluate every instance where test coverage is suppressed, tests are skipped, or coverage configuration excludes files.

**PHP — locate all suppression annotations in source and tests:**

Run via terminal:

```sh
grep -rn "@codeCoverageIgnore\|@coversNothing\|markTestSkipped\|->skip()" packages/php/src/ packages/php/tests/
```

**JS/TS — locate all suppression comments and skipped tests:**

Run via terminal:

```sh
grep -rn "c8 ignore\|istanbul ignore\|test\.skip\|it\.skip\|describe\.skip\|\.skip(\|xit(\|xdescribe(" packages/js/src/ packages/js/tests/ packages/cli/src/ packages/cli/tests/
```

**Coverage config-level exclusions:**

- Locate the JS/TS coverage configuration file (e.g. `vitest.config.ts`) discovered in Phase B — list every entry in `coverage.exclude` and `coverage.include`; justify each exclusion.
- Locate the PHP test configuration file (e.g. `phpunit.xml.dist`) discovered in Phase B — list every `<exclude>`, `<directory suffix>`, or `<file>` exclusion inside `<coverage>`.

**For each suppression or exclusion found, evaluate:**

1. **Is a justification comment present?** If not → flag `❌ Unjustified`.
2. **Is the justification valid?**
    - _"Requires real HTTP I/O"_ — can it be replaced with a mock? (PHP: `GuzzleHttp\Handler\MockHandler`; JS: `vi.mock('node:https')` / `msw`)
    - _"Requires real filesystem events / polling loop"_ — can the callback logic be extracted and unit-tested independently? (PHP: `vfsStream`; JS: `vi.spyOn(fs, ...)` + temp dir)
    - _"Delegates to X"_ — is the delegation path itself covered by a test of X, or is the delegation completely untested?
    - _PHPStan / linting workaround wrapped in a coverage ignore_ — the two concerns must be separated; the phpstan ignore must not suppress coverage.
    - _Config-level exclusion of barrel/re-export files_ — acceptable only if the file truly contains no logic.
3. **Is the excluded code security-sensitive?** If yes, escalate the finding to a `[CRIT-NNN]` entry.
4. **Classify each item as:**
    - ✅ **Justified** — genuinely untestable without a running external service, clear comment, no mock path exists
    - ⚠️ **Questionable** — justification present but the code _could_ be covered with mocks; flag as improvement opportunity
    - ❌ **Unjustified** — no justification comment, or the comment does not withstand scrutiny

If a grep command returns **no results**, explicitly confirm in the report: _"No suppression annotations / skipped tests found in [package]."_ — do not silently omit the section.

For every ⚠️ and ❌ item, produce a `[COV-NNN]` block in the report (see Step 3 format).

---

## Step 3 — Deliver the audit report

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

### 🧪 Test Coverage Suppression Audit

#### Summary table

List **every** suppression annotation, skipped test, and coverage-config exclusion found across all packages:

| File                   | Line | Annotation / Config entry | Justification present? | Verdict      |
| ---------------------- | ---- | ------------------------- | ---------------------- | ------------ |
| `packages/php/src/...` | L... | `@codeCoverageIgnore`     | ✅ Yes / ❌ No         | ✅ / ⚠️ / ❌ |

#### Issues

For every ⚠️ **Questionable** or ❌ **Unjustified** entry in the table above, produce a block using this format. Prefix `[COV-NNN]`.

#### [COV-001] Title

- 📍 File: `path/to/file`, line X
- ❌ Problem: Why the suppression is invalid or the justification does not hold
- 💥 Impact: Coverage gap, false confidence in quality metrics, security-sensitive path left untested
- ✅ Fix: Remove the suppression and add the test shown below:

```php
// BEFORE — coverage suppressed, no test
/** @codeCoverageIgnore */
public function fromUrl(string $url): static { ... }

// AFTER — suppression removed; new test added in tests/Unit/SafeAccessTest.php
it('fromUrl resolves a URL using a mocked HTTP client', function (): void {
    $mock = new \GuzzleHttp\Handler\MockHandler([
        new \GuzzleHttp\Psr7\Response(200, [], '{"key":"value"}'),
    ]);
    // ... assert SafeAccess::fromUrl(...) returns expected accessor
});
```

#### Follow-up Checklist

Add one checkbox per ⚠️ or ❌ item found during the audit:

- [ ] `[COV-NNN]` — Remove `@codeCoverageIgnore` from `File.php:L` — replace with mock test
- [ ] `[COV-NNN]` — ...

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

Consolidate **every** issue found across all prefixes (`CRIT`, `QUAL`, `ARCH`, `STYLE`, `PERF`, `COV`) into a single prioritised table. Every `[XXX-NNN]` block produced in the report above must have a corresponding row here — no issue may be omitted.

| Priority | ID        | Title | Effort | Impact |
| -------- | --------- | ----- | ------ | ------ |
| 🔴 High  | CRIT-001  | ...   | S/M/L  | High   |
| 🟡 Med   | QUAL-002  | ...   | S/M/L  | Med    |
| 🟢 Low   | STYLE-003 | ...   | S/M/L  | Low    |

---
