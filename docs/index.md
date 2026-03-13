---
layout: home
title: Home
nav_order: 1
description: Safely access deeply nested data with dot notation — one API, 9 formats, PHP + JS/TS.
permalink: /
---

# safe-access-inline

{: .fs-9 }

Safely access deeply nested data with dot notation — one API, 9 formats, PHP + JS/TS.
{: .fs-6 .fw-300 }

[![PHP CI](https://github.com/felipesauer/safe-access-inline/actions/workflows/php-ci.yml/badge.svg)](https://github.com/felipesauer/safe-access-inline/actions/workflows/php-ci.yml)
[![JS CI](https://github.com/felipesauer/safe-access-inline/actions/workflows/js-ci.yml/badge.svg)](https://github.com/felipesauer/safe-access-inline/actions/workflows/js-ci.yml)
[![npm version](https://img.shields.io/npm/v/@safe-access-inline/safe-access-inline.svg)](https://www.npmjs.com/package/@safe-access-inline/safe-access-inline)
[![Packagist Version](https://img.shields.io/packagist/v/safe-access-inline/safe-access-inline.svg)](https://packagist.org/packages/safe-access-inline/safe-access-inline)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://github.com/felipesauer/safe-access-inline/blob/main/LICENSE)

---

## Why?

Accessing nested data from configs, APIs, or file formats usually means writing defensive chains of `isset`, optional chaining, or try/catch blocks — each format with its own quirks.

**safe-access-inline** gives you one unified API that works the same in PHP and JavaScript:

```php
$accessor->get('user.profile.name', 'N/A');  // Works with JSON, XML, YAML, TOML, INI, CSV, ENV…
```

```typescript
accessor.get("user.profile.name", "N/A"); // Same API, same result
```

No exceptions. No surprises. One API, 9 formats.

---

## Features

- **Zero surprises** — `get()` never throws; always returns a default value for missing paths
- **Format-agnostic** — same API across 9 data formats
- **Immutable** — `set()` and `remove()` return new instances
- **Dot notation** — access nested data with `user.profile.name`
- **Wildcard** — `users.*.email` returns an array of all emails
- **Plugin system** — extend parsing and serialization with custom plugins via `PluginRegistry`
- **Real dependencies for YAML/TOML** — `js-yaml`/`smol-toml` (JS) and `symfony/yaml`/`devium/toml` (PHP) work out of the box
- **PHP ↔ JS parity** — identical API in both languages

---

## Supported Formats

| Format | PHP | JS/TS | Dependencies                                                                   |
| ------ | :-: | :---: | ------------------------------------------------------------------------------ |
| Array  | ✅  |  ✅   | None                                                                           |
| Object | ✅  |  ✅   | None                                                                           |
| JSON   | ✅  |  ✅   | `ext-json` (native)                                                            |
| XML    | ✅  |  ✅   | `ext-simplexml` (native) / built-in parser                                     |
| YAML   | ✅  |  ✅   | `ext-yaml` or `symfony/yaml` (PHP) / `js-yaml` (JS) — plugin override optional |
| TOML   | ✅  |  ✅   | Built-in (`devium/toml` / `smol-toml`) — plugin override optional              |
| INI    | ✅  |  ✅   | Native                                                                         |
| CSV    | ✅  |  ✅   | Native                                                                         |
| ENV    | ✅  |  ✅   | Native                                                                         |

---

## Quick Start

### PHP

```bash
composer require safe-access-inline/safe-access-inline
```

```php
use SafeAccessInline\SafeAccess;

$accessor = SafeAccess::fromJson('{"user": {"name": "Ana", "age": 30}}');
$accessor->get('user.name');           // "Ana"
$accessor->get('user.email', 'N/A');   // "N/A" (default, no exception)

// Wildcard
$accessor = SafeAccess::fromArray(['users' => [['name' => 'Ana'], ['name' => 'Bob']]]);
$accessor->get('users.*.name');        // ["Ana", "Bob"]
```

[Getting Started — PHP](php/getting-started){: .btn .btn-primary .fs-5 .mb-4 .mb-md-0 .mr-2 }
[API Reference — PHP](php/api-reference){: .btn .fs-5 .mb-4 .mb-md-0 }

### JavaScript / TypeScript

```bash
npm install @safe-access-inline/safe-access-inline
```

```typescript
import { SafeAccess } from "@safe-access-inline/safe-access-inline";

const accessor = SafeAccess.fromJson('{"user": {"name": "Ana", "age": 30}}');
accessor.get("user.name"); // "Ana"
accessor.get("user.email", "N/A"); // "N/A"

// Wildcard
const obj = SafeAccess.fromObject({
    users: [{ name: "Ana" }, { name: "Bob" }],
});
obj.get("users.*.name"); // ["Ana", "Bob"]
```

[Getting Started — JS/TS](js/getting-started){: .btn .btn-blue .fs-5 .mb-4 .mb-md-0 .mr-2 }
[API Reference — JS/TS](js/api-reference){: .btn .fs-5 .mb-4 .mb-md-0 }

---

## Learn More

- [Architecture](architecture) — design principles, component diagram, plugin system, data flow
- [Contributing](https://github.com/felipesauer/safe-access-inline/blob/main/CONTRIBUTING.md) — how to contribute
- [Security](https://github.com/felipesauer/safe-access-inline/blob/main/SECURITY.md) — vulnerability disclosure policy
