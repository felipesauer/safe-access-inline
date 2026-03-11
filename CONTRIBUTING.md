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
  - [Architecture Overview](#architecture-overview)
  - [Testing](#testing)
    - [Running Tests](#running-tests)
    - [Test Structure](#test-structure)
    - [Writing Tests for Plugin-Dependent Code](#writing-tests-for-plugin-dependent-code)
    - [Quality Gates](#quality-gates)
  - [Coding Standards](#coding-standards)
    - [PHP](#php-1)
    - [JavaScript / TypeScript](#javascript--typescript-1)
    - [General Principles](#general-principles)
  - [Commit Convention](#commit-convention)
    - [Format](#format)
    - [Types](#types)
    - [Scopes](#scopes)
    - [Breaking Changes](#breaking-changes)
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

| Tool | Version | Purpose |
|------|---------|---------|
| PHP | >= 8.2 | PHP package development |
| Composer | >= 2.x | PHP dependency management |
| Node.js | >= 18 | JS/TS package development |
| npm | >= 9.x | JS dependency management |

You only need the tools for the package you're working on. PHP contributors don't need Node.js and vice versa.

## Development Setup

This is a monorepo with two independent packages:

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

## Architecture Overview

safe-access-inline follows the **Facade + Accessor** pattern:

- **`SafeAccess`** — static facade that creates accessors via `fromJson()`, `fromYaml()`, `detect()`, etc.
- **`AbstractAccessor`** — base class implementing all data access logic (`get`, `set`, `has`, `remove`, etc.)
- **`DotNotationParser`** — static utility that resolves dot-notation paths against nested data structures
- **`PluginRegistry`** — static registry for parser and serializer plugins (YAML, TOML, custom formats)

Each concrete accessor (JSON, XML, YAML, TOML, INI, CSV, ENV, Array, Object) extends `AbstractAccessor` and only implements `parse(raw) → array`.

For a detailed component diagram and data flow, read [docs/architecture.md](docs/architecture.md).

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

When testing accessors that use the Plugin System (YAML, TOML), use **mock plugins** instead of real libraries:

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
PluginRegistry.registerParser('yaml', {
  parse: (raw: string) => ({ key: 'value' }),
});
```

Always call `PluginRegistry::reset()` / `PluginRegistry.reset()` in `beforeEach` to prevent cross-test pollution.

### Quality Gates

All pull requests must pass:

| Check | PHP | JS/TS |
|-------|-----|-------|
| Tests | `vendor/bin/pest` | `npm test` |
| Static analysis | `vendor/bin/phpstan analyse` (Level 9) | `npx tsc --noEmit` |
| Code style | `vendor/bin/php-cs-fixer fix --dry-run` | `npm run lint` |

## Coding Standards

### PHP

- **Code style**: PSR-12 (enforced by [PHP-CS-Fixer](https://cs.symfony.com/))
- **Static analysis**: PHPStan Level 9 — all code must pass strict analysis
- **Testing**: [Pest](https://pestphp.com/) framework
- **Immutability**: `set()` and `remove()` use `clone $this` — never mutate `$data` in place
- **Exceptions**: follow the exception hierarchy:
  - `AccessorException` — base exception
  - `InvalidFormatException` — malformed input
  - `PathNotFoundException` — reserved (not thrown by `get()`)
  - `UnsupportedTypeException` — unknown format or missing plugin
- **Naming**: PascalCase classes, camelCase methods, UPPER_SNAKE_CASE constants

### JavaScript / TypeScript

- **Style**: ESLint + typescript-eslint + Prettier
- **Testing**: [Vitest](https://vitest.dev/)
- **Build**: tsup → dual ESM + CJS output, target ES2022
- **Immutability**: `set()` and `remove()` use `structuredClone` — never mutate the original data
- **Errors**: follow the error hierarchy:
  - `AccessorError` — base error
  - `InvalidFormatError` — malformed input
  - `PathNotFoundError` — reserved (not thrown by `get()`)
  - `UnsupportedTypeError` — unknown format or missing plugin
- **Naming**: PascalCase classes, camelCase methods/variables, kebab-case file names

### General Principles

- **Zero dependencies** in core — format-specific parsers are registered via the Plugin System
- **`get()` never throws** — always returns a default value for missing paths
- **All write operations are immutable** — `set()` and `remove()` return new instances

## Commit Convention

This project uses [Conventional Commits](https://www.conventionalcommits.org/) with [release-please](https://github.com/googleapis/release-please) for automated versioning and changelog generation.

### Format

```
<type>(scope): <description>
```

### Types

| Type | Description | Triggers release? |
|------|-------------|:-----------------:|
| `feat` | New feature | ✅ minor |
| `fix` | Bug fix | ✅ patch |
| `docs` | Documentation only | ❌ |
| `style` | Formatting, no code change | ❌ |
| `refactor` | Code restructuring | ❌ |
| `perf` | Performance improvement | ❌ |
| `test` | Adding/fixing tests | ❌ |
| `chore` | Build, CI, tooling | ❌ |

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

Found a bug? Please [open an issue](https://github.com/felipesauer/safe-access-inline/issues/new) with:

- **Title**: a clear, concise summary of the issue
- **Environment**: PHP/Node version, OS, package version
- **Steps to reproduce**: minimal code example that demonstrates the bug
- **Expected behavior**: what you expected to happen
- **Actual behavior**: what actually happened (include error messages or stack traces)

## Suggesting Features

Have an idea? [Open an issue](https://github.com/felipesauer/safe-access-inline/issues/new) with:

- **Title**: prefix with `[Feature]` — e.g., `[Feature] Add MessagePack accessor`
- **Use case**: describe the problem you're trying to solve
- **Proposal**: describe your suggested solution
- **Alternatives**: mention any alternative approaches you've considered

## Security

If you discover a security vulnerability, please follow the [Security Policy](SECURITY.md) for responsible disclosure.

## License

By contributing, you agree that your contributions will be licensed under the [MIT License](LICENSE).
