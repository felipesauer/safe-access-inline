# safe-access-inline

> Safely access deeply nested data with dot notation — one API, 9 formats, PHP + JS/TS.

[![PHP CI](https://github.com/felipesauer/safe-access-inline/actions/workflows/php-ci.yml/badge.svg)](https://github.com/felipesauer/safe-access-inline/actions/workflows/php-ci.yml)
[![JS CI](https://github.com/felipesauer/safe-access-inline/actions/workflows/js-ci.yml/badge.svg)](https://github.com/felipesauer/safe-access-inline/actions/workflows/js-ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![PHP Version](https://img.shields.io/badge/php-%3E%3D8.2-8892BF.svg)](https://php.net)
[![Node Version](https://img.shields.io/badge/node-%3E%3D18-339933.svg)](https://nodejs.org)

## Why?

Accessing nested data from configs, APIs, or file formats usually means writing defensive chains of `isset`, optional chaining, or try/catch blocks — each format with its own quirks.

**Before:**

```php
// PHP — defensive access across formats
$name = isset($data['user']['profile']['name']) ? $data['user']['profile']['name'] : 'N/A';
```

```typescript
// JS — optional chaining still needs fallback handling
const name = data?.user?.profile?.name ?? 'N/A';
```

**After:**

```php
$accessor->get('user.profile.name', 'N/A');  // Works with JSON, XML, YAML, TOML, INI, CSV, ENV…
```

```typescript
accessor.get('user.profile.name', 'N/A');    // Same API, same result
```

One unified API. No exceptions. No surprises. Works the same in PHP and JavaScript.

## Features

- **Zero surprises** — `get()` never throws; always returns a default value for missing paths
- **Format-agnostic** — same API across 9 data formats
- **Immutable** — `set()` and `remove()` return new instances
- **Dot notation** — access nested data with `user.profile.name`
- **Wildcard** — `users.*.email` returns an array of all emails
- **Zero dependencies** in core (format-specific deps are optional/suggested)
- **PHP ↔ JS parity** — identical API in both languages

## Supported Formats

| Format | PHP | JS/TS | Dependencies |
|--------|:---:|:-----:|-------------|
| Array  | ✅  | ✅    | None |
| Object | ✅  | ✅    | None |
| JSON   | ✅  | ✅    | `ext-json` (native) |
| XML    | ✅  | ✅    | `ext-simplexml` (native) / built-in parser |
| YAML   | ✅  | ✅    | `symfony/yaml` (suggested) / built-in parser |
| TOML   | ✅  | ✅    | `devium/toml` (suggested) / built-in parser |
| INI    | ✅  | ✅    | Native |
| CSV    | ✅  | ✅    | Native |
| ENV    | ✅  | ✅    | Native |

## Quick Start

### PHP

```bash
composer require safe-access-inline/safe-access-inline
```

```php
use SafeAccessInline\SafeAccess;

// From JSON
$accessor = SafeAccess::fromJson('{"user": {"name": "Ana", "age": 30}}');
$accessor->get('user.name');           // "Ana"
$accessor->get('user.email', 'N/A');   // "N/A" (default, no exception)
$accessor->has('user.name');           // true

// Immutable set — returns a new instance
$new = $accessor->set('user.email', 'ana@example.com');
$new->get('user.email');               // "ana@example.com"
$accessor->get('user.email', 'N/A');   // "N/A" (original unchanged)

// Wildcard
$accessor = SafeAccess::fromArray(['users' => [['name' => 'Ana'], ['name' => 'Bob']]]);
$accessor->get('users.*.name');        // ["Ana", "Bob"]

// Auto-detect format
$accessor = SafeAccess::detect($anyData);

// Cross-format transformation
$accessor = SafeAccess::fromJson('{"name": "Ana"}');
$accessor->toArray();   // ['name' => 'Ana']
$accessor->toObject();  // stdClass { name: "Ana" }
$accessor->toXml();     // "<root><name>Ana</name></root>"
```

### JavaScript / TypeScript

```bash
npm install @safe-access-inline/core
```

```typescript
import { SafeAccess } from '@safe-access-inline/core';

// From JSON
const accessor = SafeAccess.fromJson('{"user": {"name": "Ana", "age": 30}}');
accessor.get('user.name');           // "Ana"
accessor.get('user.email', 'N/A');   // "N/A"
accessor.has('user.name');           // true

// Immutable set
const newAccessor = accessor.set('user.email', 'ana@example.com');
newAccessor.get('user.email');       // "ana@example.com"
accessor.get('user.email', 'N/A');   // "N/A" (original unchanged)

// Wildcard
const obj = SafeAccess.fromObject({ users: [{ name: 'Ana' }, { name: 'Bob' }] });
obj.get('users.*.name');             // ["Ana", "Bob"]

// Auto-detect
const auto = SafeAccess.detect(someData);

// Cross-format
accessor.toArray();   // { name: "Ana" }
accessor.toJson();    // '{"name":"Ana"}'
```

## Dot Notation Syntax

| Pattern | Example | Description |
|---------|---------|-------------|
| Simple | `name` | Top-level key |
| Nested | `user.profile.name` | Deep access |
| Numeric | `items.0.title` | Array index |
| Bracket | `matrix[0][1]` | Converted to `matrix.0.1` |
| Wildcard | `users.*.name` | All matching values |
| Escaped | `config\.db.host` | Literal dot in key |

## API Reference

### Facade: `SafeAccess`

| Method | Description |
|--------|-------------|
| `fromArray(data)` | Create accessor from array |
| `fromObject(data)` | Create accessor from object |
| `fromJson(data)` | Create accessor from JSON string |
| `fromXml(data)` | Create accessor from XML string |
| `fromYaml(data)` | Create accessor from YAML string |
| `fromToml(data)` | Create accessor from TOML string |
| `fromIni(data)` | Create accessor from INI string |
| `fromCsv(data)` | Create accessor from CSV string |
| `fromEnv(data)` | Create accessor from ENV string |
| `detect(data)` | Auto-detect format and create accessor |
| `extend(name, class)` | Register custom accessor |
| `custom(name, data)` | Instantiate registered custom accessor |

### Accessor Instance Methods

| Method | Returns | Description |
|--------|---------|-------------|
| `get(path, default?)` | `mixed` | Get value at path (never throws) |
| `getMany(paths)` | `array` | Get multiple paths at once |
| `has(path)` | `bool` | Check if path exists |
| `set(path, value)` | `Accessor` | Set value (returns new instance) |
| `remove(path)` | `Accessor` | Remove path (returns new instance) |
| `type(path)` | `string\|null` | Get type at path |
| `count(path?)` | `int` | Count elements |
| `keys(path?)` | `array` | List keys |
| `all()` | `array` | Get all data |
| `toArray()` | `array` | Convert to array |
| `toJson(pretty?)` | `string` | Convert to JSON |
| `toObject()` | `object` | Convert to object |
| `toXml(root?)` | `string` | Convert to XML (PHP only) |
| `toYaml()` | `string` | Convert to YAML (PHP only) |

> Full API docs: [PHP](docs/php/api-reference.md) | [JavaScript/TypeScript](docs/js/api-reference.md)

## Documentation

- [Architecture](docs/architecture.md) — design principles, component diagram, data flow
- [PHP Getting Started](docs/php/getting-started.md) — installation, usage, examples
- [PHP API Reference](docs/php/api-reference.md) — full method reference
- [JS/TS Getting Started](docs/js/getting-started.md) — installation, usage, examples
- [JS/TS API Reference](docs/js/api-reference.md) — full method reference

## Project Structure

```
safe-access-inline/
├── packages/
│   ├── php/          # PHP package (Composer)
│   └── js/           # JS/TS package (npm)
├── docs/             # Documentation
├── CHANGELOG.md
├── LICENSE           # MIT
└── README.md
```

## Development

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

## Contributing

Contributions are welcome! Please read the [Contributing Guide](CONTRIBUTING.md) before submitting a PR.

This project uses [Conventional Commits](https://www.conventionalcommits.org/) for automated versioning via [release-please](https://github.com/googleapis/release-please).

## License

[MIT](LICENSE)
