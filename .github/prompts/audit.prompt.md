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

This is a **monorepo** with two packages:

- `packages/php` — PHP library published to Packagist
- `packages/js` — TypeScript/JS library published to npm

**Core feature:** safe nested data access using dot-notation paths with support for:
wildcards (`users.*.name`), filters (`items[?price>100]`), recursive descent (`..name`), immutable write operations (`set`, `remove`, `merge`), 9 data formats (Array, Object, JSON, XML, YAML, TOML, INI, CSV, ENV), plugin system, auto-detection.

---

## Step 1 — Map the full project structure

Read and list all files and directories recursively:

```
packages/js/src/
packages/js/tests/
packages/js/benchmarks/
packages/php/src/
packages/php/tests/
packages/php/benchmarks/
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
- `core/abstract-accessor.ts`
- `core/dot-notation-parser.ts`
- `core/filter-parser.ts`
- `core/type-detector.ts`
- `core/plugin-registry.ts`
- `contracts/accessor.interface.ts`
- `contracts/readable.interface.ts`
- `contracts/writable.interface.ts`
- `contracts/transformable.interface.ts`
- `accessors/array.accessor.ts`
- `accessors/object.accessor.ts`
- `accessors/json.accessor.ts`
- `accessors/xml.accessor.ts`
- `accessors/yaml.accessor.ts`
- `accessors/toml.accessor.ts`
- `accessors/ini.accessor.ts`
- `accessors/csv.accessor.ts`
- `accessors/env.accessor.ts`
- `exceptions/accessor.error.ts`
- `exceptions/invalid-format.error.ts`
- `exceptions/path-not-found.error.ts`
- `exceptions/unsupported-type.error.ts`
- `plugins/js-yaml.parser.ts`
- `plugins/js-yaml.serializer.ts`
- `plugins/smol-toml.parser.ts`
- `plugins/smol-toml.serializer.ts`
- `types/deep-paths.ts`
- All test files in `packages/js/tests/`
- All benchmark files in `packages/js/benchmarks/`
- `packages/js/tsconfig.json`
- `packages/js/eslint.config.js`
- `packages/js/.prettierrc`
- `packages/js/vitest.config.ts`
- `packages/js/package.json`

### PHP (`packages/php/src/`)

- `SafeAccess.php`
- `Core/AbstractAccessor.php`
- `Core/DotNotationParser.php`
- `Core/FilterParser.php`
- `Core/TypeDetector.php`
- `Core/PluginRegistry.php`
- `Contracts/AccessorInterface.php`
- `Contracts/ReadableInterface.php`
- `Contracts/WritableInterface.php`
- `Contracts/TransformableInterface.php`
- `Contracts/ParserPluginInterface.php`
- `Contracts/SerializerPluginInterface.php`
- `Accessors/ArrayAccessor.php`
- `Accessors/ObjectAccessor.php`
- `Accessors/JsonAccessor.php`
- `Accessors/XmlAccessor.php`
- `Accessors/YamlAccessor.php`
- `Accessors/TomlAccessor.php`
- `Accessors/IniAccessor.php`
- `Accessors/CsvAccessor.php`
- `Accessors/EnvAccessor.php`
- `Enums/AccessorFormat.php`
- `Exceptions/AccessorException.php`
- `Exceptions/InvalidFormatException.php`
- `Exceptions/PathNotFoundException.php`
- `Exceptions/UnsupportedTypeException.php`
- `Plugins/` (all files)
- `Traits/HasFactory.php`
- `Traits/HasTransformations.php`
- `Traits/HasWildcardSupport.php`
- All test files in `packages/php/tests/`
- All benchmark files in `packages/php/benchmarks/`
- `packages/php/composer.json`
- `packages/php/phpstan.neon`
- `packages/php/.php-cs-fixer.dist.php`
- `packages/php/phpunit.xml.dist`

---

## Step 3 — Read CI/CD and tooling configuration

Read all files in `.github/workflows/` (`php-ci.yml`, `js-ci.yml`, `docs-ci.yml`, `release.yml`, `split-packages.yml`) and `.github/prompts/`.

---

## Step 4 — Run analysis

After reading all files, perform the audit across every axis below. For **every problem found**, include:

- 📍 **File + line number** (exact location)
- ❌ **Problem**: What is wrong and why
- 💥 **Impact**: Runtime risk / DX degradation / maintenance burden / security
- ✅ **Solution**: Show a `BEFORE` and `AFTER` code block with the fix

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

| Feature / Library    | safe-access-inline | lodash.get | dot-prop | get-value | adrot/dot | data-get (PHP) |
| -------------------- | ------------------ | ---------- | -------- | --------- | --------- | -------------- |
| Dot notation         | ✅                 | ✅         | ✅       | ✅        | ✅        | ✅             |
| Wildcard             | ...                | ...        | ...      | ...       | ...       | ...            |
| Filters              | ...                | ...        | ...      | ...       | ...       | ...            |
| Recursive descent    | ...                | ...        | ...      | ...       | ...       | ...            |
| Immutable writes     | ...                | ...        | ...      | ...       | ...       | ...            |
| Multi-format support | ...                | ...        | ...      | ...       | ...       | ...            |
| TypeScript generics  | ...                | ...        | ...      | ...       | ...       | ...            |
| Bundle size          | ...                | ...        | ...      | ...       | ...       | ...            |

Write a paragraph on what this library does **better** and what needs improvement to compete.

---

### 📋 Prioritised Refactoring Roadmap

| Priority | ID        | Title | Effort | Impact |
| -------- | --------- | ----- | ------ | ------ |
| 🔴 High  | CRIT-001  | ...   | S/M/L  | High   |
| 🟡 Med   | QUAL-002  | ...   | S/M/L  | Med    |
| 🟢 Low   | STYLE-003 | ...   | S/M/L  | Low    |

---
