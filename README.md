# safe-access-inline

> Safely access deeply nested data with dot notation — one API, 9 formats, PHP + JS/TS.

[![PHP CI](https://github.com/felipesauer/safe-access-inline/actions/workflows/php-ci.yml/badge.svg)](https://github.com/felipesauer/safe-access-inline/actions/workflows/php-ci.yml)
[![JS CI](https://github.com/felipesauer/safe-access-inline/actions/workflows/js-ci.yml/badge.svg)](https://github.com/felipesauer/safe-access-inline/actions/workflows/js-ci.yml)
[![npm version](https://img.shields.io/npm/v/@safe-access-inline/safe-access-inline.svg)](https://www.npmjs.com/package/@safe-access-inline/safe-access-inline)
[![Packagist Version](https://img.shields.io/packagist/v/safe-access-inline/safe-access-inline.svg)](https://packagist.org/packages/safe-access-inline/safe-access-inline)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![PHP Version](https://img.shields.io/badge/php-%3E%3D8.2-8892BF.svg)](https://php.net)
[![Node Version](https://img.shields.io/badge/node-%3E%3D18-339933.svg)](https://nodejs.org)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg)](CONTRIBUTING.md)

---

## Table of Contents

- [Why?](#why)
- [Features](#features)
- [Supported Formats](#supported-formats)
- [Quick Start](#quick-start)
- [Plugin System](#plugin-system)
- [Dot Notation Syntax](#dot-notation-syntax)
- [API Reference](#api-reference)
- [Documentation](#documentation)
- [Project Structure](#project-structure)
- [Development](#development)
- [Contributing](#contributing)
- [Security](#security)
- [License](#license)

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
- **Plugin system** — extend parsing and serialization with custom plugins via `PluginRegistry`
- **Zero dependencies** in core — format-specific parsers are registered via the Plugin System
- **PHP ↔ JS parity** — identical API in both languages

## Supported Formats

| Format | PHP | JS/TS | Dependencies |
|--------|:---:|:-----:|-------------|
| Array  | ✅  | ✅    | None |
| Object | ✅  | ✅    | None |
| JSON   | ✅  | ✅    | `ext-json` (native) |
| XML    | ✅  | ✅    | `ext-simplexml` (native) / built-in parser |
| YAML   | ✅  | ✅    | Plugin required (PHP) / built-in parser with optional plugin override (JS) |
| TOML   | ✅  | ✅    | Plugin required (PHP) / built-in parser with optional plugin override (JS) |
| INI    | ✅  | ✅    | Native |
| CSV    | ✅  | ✅    | Native |
| ENV    | ✅  | ✅    | Native |

> **PHP YAML/TOML**: parsing is fully delegated to plugins — register a parser via `PluginRegistry` before using `fromYaml()` / `fromToml()`.
> **JS YAML/TOML**: built-in lightweight parsers work out of the box. Register a plugin to override them with a more robust parser.

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
npm install @safe-access-inline/safe-access-inline
```

```typescript
import { SafeAccess } from '@safe-access-inline/safe-access-inline';

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

## Plugin System

The Plugin System decouples format parsing and serialization from external libraries. Instead of hard-coding dependencies, parsers and serializers are registered at runtime via `PluginRegistry`.

### PHP — Register Plugins

```php
use SafeAccessInline\Core\PluginRegistry;
use SafeAccessInline\Plugins\SymfonyYamlParser;
use SafeAccessInline\Plugins\SymfonyYamlSerializer;
use SafeAccessInline\Plugins\DeviumTomlParser;

// Register YAML support (requires composer require symfony/yaml)
PluginRegistry::registerParser('yaml', new SymfonyYamlParser());
PluginRegistry::registerSerializer('yaml', new SymfonyYamlSerializer());

// Register TOML support (requires composer require devium/toml)
PluginRegistry::registerParser('toml', new DeviumTomlParser());

// Now you can use YAML and TOML
$accessor = SafeAccess::fromYaml("name: Ana\nage: 30");
$accessor->get('name');              // "Ana"
$accessor->toYaml();                 // "name: Ana\nage: 30\n"
$accessor->transform('yaml');        // Same — generic serialization
```

### JS/TS — Register Plugins

```typescript
import { SafeAccess, PluginRegistry } from '@safe-access-inline/safe-access-inline';

// Register a YAML serializer (e.g., using js-yaml)
PluginRegistry.registerSerializer('yaml', {
  serialize: (data) => jsYaml.dump(data),
});

// Now toYaml() and transform('yaml') work
const accessor = SafeAccess.fromJson('{"name": "Ana"}');
accessor.toYaml();              // "name: Ana\n"
accessor.transform('yaml');     // Same result
```

### Shipped Plugins (PHP)

| Plugin | Format | Type | Requires |
|--------|--------|------|----------|
| `SymfonyYamlParser` | yaml | Parser | `symfony/yaml` |
| `SymfonyYamlSerializer` | yaml | Serializer | `symfony/yaml` |
| `NativeYamlParser` | yaml | Parser | `ext-yaml` |
| `DeviumTomlParser` | toml | Parser | `devium/toml` |

> See [PHP Getting Started — Plugin System](docs/php/getting-started.md#plugin-system) for detailed examples.

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
| `toXml(root?)` | `string` | Convert to XML |
| `toYaml()` | `string` | Convert to YAML (requires serializer plugin) |
| `transform(format)` | `string` | Convert to any plugin-registered format |

### PluginRegistry

| Method | Description |
|--------|-------------|
| `registerParser(format, plugin)` | Register a parser plugin for a format |
| `registerSerializer(format, plugin)` | Register a serializer plugin for a format |
| `hasParser(format)` | Check if a parser is registered |
| `hasSerializer(format)` | Check if a serializer is registered |
| `getParser(format)` | Get registered parser (throws if missing) |
| `getSerializer(format)` | Get registered serializer (throws if missing) |
| `reset()` | Clear all registered plugins (for testing) |

> Full API docs: [PHP](docs/php/api-reference.md) | [JavaScript/TypeScript](docs/js/api-reference.md)

## Documentation

- [Architecture](docs/architecture.md) — design principles, component diagram, plugin system, data flow
- [PHP Getting Started](docs/php/getting-started.md) — installation, plugin setup, usage examples
- [PHP API Reference](docs/php/api-reference.md) — full method reference
- [JS/TS Getting Started](docs/js/getting-started.md) — installation, plugin setup, usage examples
- [JS/TS API Reference](docs/js/api-reference.md) — full method reference

## Project Structure

```
safe-access-inline/
├── packages/
│   ├── php/                 # PHP package (Composer)
│   │   ├── src/
│   │   │   ├── Accessors/   # 9 format accessors
│   │   │   ├── Contracts/   # Interfaces (incl. ParserPlugin, SerializerPlugin)
│   │   │   ├── Core/        # AbstractAccessor, DotNotationParser, PluginRegistry
│   │   │   ├── Exceptions/  # Exception hierarchy
│   │   │   ├── Plugins/     # Shipped parser/serializer plugins
│   │   │   ├── Traits/      # HasFactory, HasTransformations, HasWildcardSupport
│   │   │   └── SafeAccess.php
│   │   └── tests/
│   └── js/                  # JS/TS package (npm)
│       ├── src/
│       │   ├── accessors/   # 9 format accessors
│       │   ├── contracts/   # TypeScript interfaces
│       │   ├── core/        # AbstractAccessor, DotNotationParser, PluginRegistry
│       │   ├── exceptions/  # Error hierarchy
│       │   ├── safe-access.ts
│       │   └── index.ts
│       └── tests/
├── docs/                    # Documentation
├── .github/workflows/       # CI/CD
├── CHANGELOG.md
├── CODE_OF_CONDUCT.md
├── CONTRIBUTING.md
├── LICENSE                  # MIT
├── SECURITY.md
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

Please note that this project is released with a [Code of Conduct](CODE_OF_CONDUCT.md). By participating in this project you agree to abide by its terms.

## Security

If you discover a security vulnerability, please follow the [Security Policy](SECURITY.md) for responsible disclosure.

## License

[MIT](LICENSE) — Copyright (c) 2026 Felipe Sauer
