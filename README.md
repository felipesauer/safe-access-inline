# safe-access-inline

> Safely access deeply nested data with dot notation — one API, 9 formats, PHP + JS/TS.

[![PHP CI](https://github.com/felipesauer/safe-access-inline/actions/workflows/php-ci.yml/badge.svg)](https://github.com/felipesauer/safe-access-inline/actions/workflows/php-ci.yml)
[![JS CI](https://github.com/felipesauer/safe-access-inline/actions/workflows/js-ci.yml/badge.svg)](https://github.com/felipesauer/safe-access-inline/actions/workflows/js-ci.yml)
[![npm version](https://img.shields.io/npm/v/@safe-access-inline/safe-access-inline.svg)](https://www.npmjs.com/package/@safe-access-inline/safe-access-inline)
[![Packagist Version](https://img.shields.io/packagist/v/safe-access-inline/safe-access-inline.svg)](https://packagist.org/packages/safe-access-inline/safe-access-inline)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![PHP Version](https://img.shields.io/badge/php-%3E%3D8.2-8892BF.svg)](https://php.net)
[![Node Version](https://img.shields.io/badge/node-%3E%3D22-339933.svg)](https://nodejs.org)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg)](CONTRIBUTING.md)

---

📖 **Documentation:** [felipesauer.github.io/safe-access-inline](https://felipesauer.github.io/safe-access-inline)

---

## Install

```bash
# PHP
composer require safe-access-inline/safe-access-inline

# JavaScript / TypeScript
npm install @safe-access-inline/safe-access-inline
```

## Quick Example

```php
use SafeAccessInline\SafeAccess;

$accessor = SafeAccess::fromJson('{"user": {"name": "Ana", "age": 30}}');
$accessor->get('user.name');           // "Ana"
$accessor->get('user.email', 'N/A');   // "N/A" — never throws
$accessor->get('users.*.name');        // ["Ana", "Bob"] — wildcard
```

```typescript
import { SafeAccess } from "@safe-access-inline/safe-access-inline";

const accessor = SafeAccess.fromJson('{"user": {"name": "Ana", "age": 30}}');
accessor.get("user.name"); // "Ana"
accessor.get("user.email", "N/A"); // "N/A" — never throws
accessor.get("users.*.name"); // ["Ana", "Bob"] — wildcard
```

## Supported Formats

Array · Object · JSON · XML · YAML · TOML · INI · CSV · ENV

YAML and TOML work out of the box — no plugin registration needed.

## Learn More

- [Documentation](https://felipesauer.github.io/safe-access-inline) — getting started, API reference, architecture
- [Contributing](CONTRIBUTING.md) — how to contribute
- [Security](SECURITY.md) — vulnerability disclosure policy
- [License](LICENSE) — MIT
