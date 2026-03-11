# Contributing to safe-access-inline

Thank you for considering contributing! This guide will help you get started.

## Development Setup

This is a monorepo with two packages:

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

1. Fork the repo and create a branch from `main`
2. Make your changes following the coding standards
3. Add or update tests for any changed functionality
4. Ensure all tests pass and linters are clean
5. Use conventional commit messages
6. Open a PR against `main`

## Coding Standards

### PHP
- PSR-12 code style (enforced by PHP-CS-Fixer)
- PHPStan Level 9 (strict static analysis)
- Pest testing framework

### JavaScript / TypeScript
- ESLint + typescript-eslint
- Prettier for formatting
- Vitest for testing
- Target: ES2022, dual ESM/CJS output

## Architecture

Before contributing, read [docs/architecture.md](docs/architecture.md) to understand the design patterns and component relationships.

## License

By contributing, you agree that your contributions will be licensed under the [MIT License](LICENSE).
