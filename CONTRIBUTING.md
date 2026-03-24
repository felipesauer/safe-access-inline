# Contributing to safe-access-inline

Thank you for considering contributing! This guide covers everything you need to get started.

## Table of Contents

- [Contributing to safe-access-inline](#contributing-to-safe-access-inline)
    - [Table of Contents](#table-of-contents)
    - [Code of Conduct](#code-of-conduct)
    - [Prerequisites](#prerequisites)
    - [Development Setup](#development-setup)
        - [PHP](#php)
        - [JavaScript / TypeScript](#javascript--typescript)
        - [CLI](#cli)
    - [Architecture Overview](#architecture-overview)
    - [Testing](#testing)
        - [Running Tests](#running-tests)
        - [Test Structure](#test-structure)
        - [Writing Tests for Plugin-Dependent Code](#writing-tests-for-plugin-dependent-code)
        - [Global State Teardown](#global-state-teardown)
        - [Quality Gates](#quality-gates)
        - [Future Quality Improvements](#future-quality-improvements)
        - [Mutation Testing](#mutation-testing)
        - [Documentation](#documentation)
    - [Coding Standards](#coding-standards)
        - [PHP](#php-1)
        - [JavaScript / TypeScript](#javascript--typescript-1)
        - [General Principles](#general-principles)
    - [Commit Convention](#commit-convention)
        - [Format](#format)
        - [Types](#types)
        - [Scopes](#scopes)
        - [Breaking Changes](#breaking-changes)
    - [Git Hooks (Automated Quality)](#git-hooks-automated-quality)
        - [What the hooks do](#what-the-hooks-do)
        - [Commit message examples](#commit-message-examples)
        - [Available scopes](#available-scopes)
        - [Bypassing hooks (emergency only)](#bypassing-hooks-emergency-only)
    - [Pull Requests](#pull-requests)
        - [Before Opening a PR](#before-opening-a-pr)
        - [PR Expectations](#pr-expectations)
        - [Review Process](#review-process)
    - [Reporting Bugs](#reporting-bugs)
    - [Suggesting Features](#suggesting-features)
    - [Security](#security)
    - [License](#license)

## Code of Conduct

This project is governed by the [Contributor Covenant Code of Conduct](CODE_OF_CONDUCT.md). By participating, you are expected to uphold this code. Please report unacceptable behavior via [GitHub Issues](https://github.com/felipesauer/safe-access-inline/issues).

## Prerequisites

| Tool     | Version | Purpose                   |
| -------- | ------- | ------------------------- |
| PHP      | >= 8.2  | PHP package development   |
| Composer | >= 2.x  | PHP dependency management |
| Node.js  | >= 24   | JS/TS package development |
| npm      | >= 9.x  | JS dependency management  |

You only need the tools for the package you're working on. PHP contributors don't need Node.js and vice versa.

> **Node version note:** The repository's `.nvmrc` specifies Node 24 for local development. The package supports Node 24+ (tested in CI against 24). Run `nvm use` to switch to the recommended development version.

## Development Setup

This is a monorepo with three independent packages:

```bash
git clone https://github.com/felipesauer/safe-access-inline.git
cd safe-access-inline
```

### PHP

```bash
cd packages/php
composer install
vendor/bin/pest              # Run tests
vendor/bin/phpstan analyse   # Static analysis (Level 9)
vendor/bin/php-cs-fixer fix  # Code style (PSR-12)
```

### JavaScript / TypeScript

```bash
cd packages/js
npm install
npm test          # Run tests (Vitest)
npm run build     # Build (tsup → ESM + CJS)
npm run lint      # ESLint
npm run format    # Prettier
```

### CLI

```bash
cd packages/cli
npm install
npm test          # Run tests (Vitest)
npm run build     # Build (tsup → ESM)
```

## Architecture Overview

safe-access-inline follows the **Facade + Accessor** pattern:

- **`SafeAccess`** — static facade that creates accessors via `fromJson()`, `fromYaml()`, `detect()`, etc.
- **`AbstractAccessor`** — base class implementing all data access logic (`get`, `set`, `has`, `remove`, etc.)
- **`DotNotationParser`** — static utility that resolves dot-notation paths against nested data structures
- **`PluginRegistry`** — static registry for parser and serializer plugins (YAML, TOML, custom formats)

Each concrete accessor (JSON, XML, YAML, TOML, INI, CSV, ENV, NDJSON, Array, Object) extends `AbstractAccessor` and only implements `parse(raw) → array`.

For a detailed component diagram and data flow, read [Architecture](https://felipesauer.github.io/safe-access-inline/architecture/).

## Testing

### Running Tests

```bash
# PHP
cd packages/php
vendor/bin/pest                          # All tests
vendor/bin/pest --filter=YamlAccessor    # Specific test file
vendor/bin/pest tests/Unit/              # Unit tests only

# JavaScript / TypeScript
cd packages/js
npm test                                 # All tests
npx vitest run --reporter=verbose        # Verbose output
```

### Test Structure

Tests are organized into two categories:

- **Unit tests** (`tests/Unit/` / `tests/unit/`) — test individual components in isolation. These must never depend on external libraries.
- **Integration tests** (`tests/Integration/` / `tests/integration/`) — test cross-format pipelines and real parser plugins. These may skip if optional dependencies are not installed.

### Writing Tests for Plugin-Dependent Code

YAML and TOML now have real library dependencies, so accessors work without plugin registration. However, when testing **plugin override** behavior or testing in **isolation**, use **mock plugins**:

```php
// PHP — register a mock parser in beforeEach
PluginRegistry::reset();
PluginRegistry::registerParser('yaml', new class implements ParserPluginInterface {
    public function parse(string $raw): array {
        return ['key' => 'value'];
    }
});
```

```typescript
// JS/TS — register a mock parser in beforeEach
PluginRegistry.reset();
PluginRegistry.registerParser("yaml", {
    parse: (raw: string) => ({ key: "value" }),
});
```

Always call `PluginRegistry::reset()` / `PluginRegistry.reset()` in `beforeEach` to prevent cross-test pollution.

### Global State Teardown

Both packages expose a `resetAll()` utility that clears all global/static state (global policy, path cache, plugin registry, schema registry, audit listeners). This is called automatically in `afterEach` via the test setup files:

- **PHP:** `SafeAccess::resetAll()` — registered globally in `tests/Pest.php`
- **JS/TS:** `resetAll()` from `@safe-access-inline/safe-access-inline/testing` — registered in `tests/setup.ts`

If you write tests that mutate global state, you do **not** need manual cleanup — the global teardown handles it. For external consumers writing tests against this library:

```typescript
// JS/TS
import { resetAll } from "@safe-access-inline/safe-access-inline/testing";
import { afterEach } from "vitest"; // or jest, etc.
afterEach(() => resetAll());
```

```php
// PHP
afterEach(fn () => \SafeAccessInline\SafeAccess::resetAll());
```

### Quality Gates

All pull requests must pass:

| Check            | PHP                                     | JS/TS                              |
| ---------------- | --------------------------------------- | ---------------------------------- |
| Tests            | `vendor/bin/pest`                       | `npm test`                         |
| Static analysis  | `vendor/bin/phpstan analyse` (Level 9)  | `npx tsc --noEmit`                 |
| Code style       | `vendor/bin/php-cs-fixer fix --dry-run` | `npm run lint`                     |
| Mutation testing | `composer test:mutation` (100% MSI)     | `npm run test:mutation` (100% MSI) |

### Future Quality Improvements

The following tools are planned for v1.0:

- **Performance benchmarks** — per-format parsing and serialization benchmarks integrated into CI to track regressions.

### Mutation Testing

Mutation testing is enforced across all packages with **100% Mutation Score Index (MSI)**:

| Package | Tool                                      | Config                | Threshold |
| ------- | ----------------------------------------- | --------------------- | --------- |
| JS/TS   | [Stryker](https://stryker-mutator.io/)    | `stryker.config.json` | 100% MSI  |
| CLI     | [Stryker](https://stryker-mutator.io/)    | `stryker.config.json` | 100% MSI  |
| PHP     | [Infection](https://infection.github.io/) | `infection.json5`     | 100% MSI  |

Run mutation tests per package:

```bash
# JS/TS
cd packages/js && npm run test:mutation

# CLI
cd packages/cli && npm run test:mutation

# PHP
cd packages/php && composer test:mutation
```

### Documentation

Documentation in `docs/` is published via GitHub Pages + VitePress at [felipesauer.github.io/safe-access-inline](https://felipesauer.github.io/safe-access-inline).

**Structure:**

```
docs/
├── .vitepress/
│   └── config.ts        # VitePress config (nav, sidebar, i18n)
├── index.md             # EN landing page
├── guide/
│   ├── index.md
│   └── architecture.md
├── js/                  # JS/TS docs (EN)
│   ├── index.md
│   ├── getting-started.md
│   └── api-reference.md
├── php/                 # PHP docs (EN)
│   ├── index.md
│   ├── getting-started.md
│   └── api-reference.md
├── cli/
│   └── index.md             # CLI command reference
└── pt-br/               # Portuguese (BR) translations
    ├── index.md
    ├── guide/
    ├── js/
    ├── php/
    └── cli/
```

**Editing docs:**

- When creating a new page, also create the corresponding `pt-br/` translation (even a stub is fine)
- When modifying a page, update the `pt-br/` translation too
- Navigation is configured in `docs/.vitepress/config.ts`

**Local preview:**

```bash
npm run docs:dev
# → http://localhost:5173/safe-access-inline/
```

**Docs ↔ code alignment rules:**

- New feature or API change → update Getting Started and/or API Reference for the affected language(s)
- Behavior change → update Architecture if it affects design or data flow
- Use `docs` scope in conventional commits: `docs: update PHP API reference for new method`

**Version bump:**

The version displayed in the docs is updated automatically by Release Please during releases.

## Coding Standards

### PHP

- **Code style**: PSR-12 (enforced by [PHP-CS-Fixer](https://cs.symfony.com/))
- **Indentation**: 4 spaces (enforced by `.editorconfig` and PHP-CS-Fixer)
- **Static analysis**: PHPStan Level 9 — all code must pass strict analysis
- **Testing**: [Pest](https://pestphp.com/) framework
- **Test describes**: use `ClassName::class` in `describe()` blocks for unit tests. Use string literals only for descriptive integration test suites
- **Immutability**: `set()` and `remove()` use `clone $this` — never mutate `$data` in place
- **Exceptions**: follow the exception hierarchy:
    - `AccessorException` — base exception
    - `InvalidFormatException` — malformed input
    - `PathNotFoundException` — reserved (not thrown by `get()`)
    - `UnsupportedTypeException` — unknown format or missing plugin
- **Naming**: PascalCase classes, camelCase methods, UPPER_SNAKE_CASE constants

### JavaScript / TypeScript

- **Style**: ESLint + typescript-eslint + Prettier
- **Indentation**: 4 spaces (enforced by Prettier and `.editorconfig`)
- **Testing**: [Vitest](https://vitest.dev/)
- **Test describes**: use `ClassName.name` in `describe()` blocks for unit tests (equivalent to PHP's `::class`). Use string literals only for descriptive integration test suites
- **Build**: tsup → dual ESM + CJS output, target ES2022
- **Immutability**: `set()` and `remove()` use `structuredClone` — never mutate the original data
- **Errors**: follow the error hierarchy:
    - `AccessorError` — base error
    - `InvalidFormatError` — malformed input
    - `PathNotFoundError` — reserved (not thrown by `get()`)
    - `UnsupportedTypeError` — unknown format or missing plugin
- **Naming**: PascalCase classes, camelCase methods/variables, kebab-case file names

### General Principles

- **Real dependencies for YAML/TOML** — `js-yaml`/`smol-toml` (JS) and `symfony/yaml`/`devium/toml` (PHP) are included as direct dependencies. The Plugin System provides override capability, not a requirement.
- **`get()` never throws** — always returns a default value for missing paths
- **All write operations are immutable** — `set()` and `remove()` return new instances

## Commit Convention

This project uses [Conventional Commits](https://www.conventionalcommits.org/) with [release-please](https://github.com/googleapis/release-please) for automated versioning and changelog generation.

### Format

```
<type>(scope): <description>
```

### Types

| Type       | Description                | Triggers release? |
| ---------- | -------------------------- | :---------------: |
| `feat`     | New feature                |     ✅ minor      |
| `fix`      | Bug fix                    |     ✅ patch      |
| `docs`     | Documentation only         |        ❌         |
| `style`    | Formatting, no code change |        ❌         |
| `refactor` | Code restructuring         |        ❌         |
| `perf`     | Performance improvement    |        ❌         |
| `test`     | Adding/fixing tests        |        ❌         |
| `chore`    | Build, CI, tooling         |        ❌         |

### Scopes

Use `php` or `js` to indicate which package the change affects:

```
feat(php): add support for TOML nested tables
fix(js): handle empty XML string in XmlAccessor
docs: update architecture diagram
```

### Breaking Changes

Add `BREAKING CHANGE:` in the commit footer or `!` after the type:

```
feat(php)!: rename SafeAccess::from() to SafeAccess::detect()

BREAKING CHANGE: The `from()` method has been renamed to `detect()` for clarity.
```

## Git Hooks (Automated Quality)

This project uses [Husky](https://typicode.github.io/husky/) to enforce quality standards automatically through git hooks. After running `npm install` in the repository root, hooks are set up automatically.

### What the hooks do

| Hook         | Tool                                                      | Purpose                                               |
| ------------ | --------------------------------------------------------- | ----------------------------------------------------- |
| `commit-msg` | [commitlint](https://commitlint.js.org/)                  | Validates commit messages follow Conventional Commits |
| `pre-commit` | [lint-staged](https://github.com/lint-staged/lint-staged) | Runs linters/formatters on staged files               |

### Commit message examples

```bash
# ✅ Valid commits
git commit -m "feat(js): add MessagePack accessor"
git commit -m "fix(php): handle empty XML string in XmlAccessor"
git commit -m "docs: update getting started guide"
git commit -m "chore(ci): upgrade Node matrix to v24"
git commit -m "test(php): add edge cases for DotNotationParser"

# ⚠️ Accepted with warning
git commit -m "feat: did something"       # Missing scope (warning, not error)

# ❌ Invalid commits (will be rejected)
git commit -m "fixed stuff"              # Missing type
git commit -m "Feature(js): add thing"    # Type must be lowercase
```

### Available scopes

| Scope  | When to use                |
| ------ | -------------------------- |
| `js`   | Changes to `packages/js/`  |
| `php`  | Changes to `packages/php/` |
| `docs` | Documentation changes      |
| `ci`   | CI/CD and workflow changes |
| `deps` | Dependency updates         |

### Bypassing hooks (emergency only)

In rare cases, you can skip hooks with `--no-verify`, but CI will still enforce all checks:

```bash
git commit -m "wip: temporary" --no-verify
```

## Pull Requests

### Before Opening a PR

1. Fork the repo and create a feature branch from `main`
2. Make your changes following the [Coding Standards](#coding-standards)
3. Add or update tests for any changed functionality
4. Run all quality gates locally and ensure they pass
5. Write clear conventional commit messages

### PR Expectations

- **One concern per PR** — keep changes focused. A bug fix shouldn't include unrelated refactoring.
- **Tests required** — every new feature or bug fix must include tests. PRs that decrease test coverage will not be merged.
- **CI must pass** — GitHub Actions runs tests, static analysis, and linting on every PR. All checks must be green.
- **Description** — include a clear description of what the PR does and why. Reference any related issues.

### Review Process

1. A maintainer will review your PR and may request changes.
2. Address feedback by pushing new commits (do not force-push during review).
3. Once approved, a maintainer will merge your PR using squash merge.

## Reporting Bugs

Found a bug? [Open a bug report](https://github.com/felipesauer/safe-access-inline/issues/new?template=bug_report.yml) using the issue template. It will guide you through providing all the necessary information.

## Suggesting Features

Have an idea? [Open a feature request](https://github.com/felipesauer/safe-access-inline/issues/new?template=feature_request.yml) using the issue template.

## Security

If you discover a security vulnerability, please follow the [Security Policy](SECURITY.md) for responsible disclosure.

## License

By contributing, you agree that your contributions will be licensed under the [MIT License](LICENSE).
