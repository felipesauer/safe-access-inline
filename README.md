# safe-access-inline

> Safely access deeply nested data with dot notation — one API, 9 formats, PHP + JS/TS.

[![PHP CI](https://github.com/felipesauer/safe-access-inline/actions/workflows/php-ci.yml/badge.svg)](https://github.com/felipesauer/safe-access-inline/actions/workflows/php-ci.yml)
[![JS CI](https://github.com/felipesauer/safe-access-inline/actions/workflows/js-ci.yml/badge.svg)](https://github.com/felipesauer/safe-access-inline/actions/workflows/js-ci.yml)
[![codecov](https://codecov.io/gh/felipesauer/safe-access-inline/graph/badge.svg)](https://codecov.io/gh/felipesauer/safe-access-inline)
[![npm version](https://img.shields.io/npm/v/@safe-access-inline/safe-access-inline.svg)](https://www.npmjs.com/package/@safe-access-inline/safe-access-inline)
[![Packagist Version](https://img.shields.io/packagist/v/safe-access-inline/safe-access-inline.svg)](https://packagist.org/packages/safe-access-inline/safe-access-inline)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![PHP Version](https://img.shields.io/badge/php-%3E%3D8.2-8892BF.svg)](https://php.net)
[![Node Version](https://img.shields.io/badge/node-%3E%3D22-339933.svg)](https://nodejs.org)
[![PHPStan Level 9](https://img.shields.io/badge/PHPStan-level%209-brightgreen.svg)](https://phpstan.org/)
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

$accessor = SafeAccess::from('{"user": {"name": "Ana"}, "items": [{"price": 10}, {"price": 50}]}');
$accessor->get('user.name');              // "Ana"
$accessor->get('user.email', 'N/A');      // "N/A" — never throws
$accessor->get('items.*.price');          // [10, 50] — wildcard
$accessor->get('items[?price>20].price'); // [50] — filter
$accessor->get('..name');                 // ["Ana"] — recursive descent
$accessor->merge('user', ['age' => 30]); // deep merge — new instance
```

```typescript
import { SafeAccess } from "@safe-access-inline/safe-access-inline";

const accessor = SafeAccess.from(
    '{"user": {"name": "Ana"}, "items": [{"price": 10}, {"price": 50}]}',
);
accessor.get("user.name"); // "Ana"
accessor.get("user.email", "N/A"); // "N/A" — never throws
accessor.get("items.*.price"); // [10, 50] — wildcard
accessor.get("items[?price>20].price"); // [50] — filter
accessor.get("..name"); // ["Ana"] — recursive descent
accessor.merge("user", { age: 30 }); // deep merge — new instance
```

## Supported Formats

Array · Object · JSON · XML · YAML · TOML · INI · CSV · ENV

YAML and TOML work out of the box — no plugin registration needed.

## Path Expressions

| Syntax    | Description       | Example               |
| --------- | ----------------- | --------------------- |
| `a.b.c`   | Nested key        | `user.profile.name`   |
| `a[0]`    | Index             | `items[0].title`      |
| `a.*`     | Wildcard          | `users.*.name`        |
| `a[?f>v]` | Filter            | `products[?price>20]` |
| `..key`   | Recursive descent | `..name`              |

Filters support `==`, `!=`, `>`, `<`, `>=`, `<=` with `&&` / `||` logic.

## Comparison

| Feature                      | safe-access-inline | lodash.get | data-get (PHP) | adroit/dot |
| ---------------------------- | ------------------ | ---------- | -------------- | ---------- |
| Multi-language (PHP + JS)    | ✅                 | ❌         | ❌             | ❌         |
| 9 formats (JSON, XML, YAML…) | ✅                 | ❌         | ❌             | ❌         |
| Immutable writes             | ✅                 | ❌         | ❌             | ❌         |
| Wildcard `*`                 | ✅                 | ❌         | ✅             | ✅         |
| Filter `[?field>val]`        | ✅                 | ❌         | ❌             | ❌         |
| Recursive descent `..key`    | ✅                 | ❌         | ❌             | ❌         |
| Deep merge                   | ✅                 | ❌         | ❌             | ❌         |
| Plugin system                | ✅                 | ❌         | ❌             | ❌         |
| Zero-dependency core         | ✅                 | ✅         | ✅             | ✅         |
| Type-safe (TypeScript)       | ✅                 | partial    | N/A            | N/A        |

## Benchmarks

Measured on a single core (Node 22 / PHP 8.2). Numbers may vary by hardware.

| Operation                             | JS (ops/s) | PHP (µs/op) |
| ------------------------------------- | ---------- | ----------- |
| Shallow get (`a.b`)                   | ~801 K     | 1.24        |
| 4-level get (`a.b.c.d.e`)             | ~531 K     | 8.23        |
| Wildcard 100 items (`items.*.id`)     | ~219 K     | 54.67       |
| Filter 100 items (`items[?price>50]`) | ~132 K     | ~105        |
| Set                                   | ~349 K     | 1.03        |
| Merge                                 | ~269 K     | 0.72        |

Reproduce locally:

```bash
# JavaScript
cd packages/js && npx vitest bench --run

# PHP
cd packages/php && php benchmarks/dot-notation.php
```

## Ecosystem & Plugins

Both implementations ship with a **plugin system** that lets you override default parsers/serializers or register support for new formats.

- YAML and TOML work **out of the box** — zero-config.
- Override any built-in parser/serializer (e.g., swap `js-yaml` for a custom YAML lib).
- Register plugins for additional formats (CSV serializer, XML serializer, etc.).
- Use `transform(format)` to serialize to any registered format.

📖 Full plugin guides: [JS Plugins](https://felipesauer.github.io/safe-access-inline/js/plugins/) · [PHP Plugins](https://felipesauer.github.io/safe-access-inline/php/plugins/)

## Learn More

- [Documentation](https://felipesauer.github.io/safe-access-inline) — getting started, API reference, architecture
- [Contributing](CONTRIBUTING.md) — how to contribute
- [Security](SECURITY.md) — vulnerability disclosure policy
- [License](LICENSE) — MIT
