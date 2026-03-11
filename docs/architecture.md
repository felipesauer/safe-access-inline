# Architecture

## Overview

safe-access-inline is a format-agnostic data access library that provides a single API for safely reading, writing, and transforming deeply nested data structures. It follows the **Facade pattern** with a pluggable accessor system.

## Design Principles

1. **Zero Surprises** — `get()` never throws exceptions. Missing paths return a default value.
2. **Format-Agnostic** — The same API works identically across all supported formats.
3. **Immutability** — `set()` and `remove()` always return new instances; the original is never mutated.
4. **Zero Dependencies** — The core library has no external runtime dependencies. Format-specific parsers are optional/suggested.
5. **Extensibility** — Custom accessors can be registered at runtime via `SafeAccess::extend()`.

## Component Diagram

```
┌──────────────────────────────┐
│       SafeAccess Facade      │  ← Static entry point
│  fromArray / fromJson / ...  │
│  detect / extend / custom    │
└──────────┬───────────────────┘
           │ creates
           ▼
┌──────────────────────────────┐
│     AbstractAccessor         │  ← Base class (all logic)
│  get / set / remove / has    │
│  toArray / toJson / toXml    │
│  type / count / keys / all   │
└──────────┬───────────────────┘
           │ delegates path resolution to
           ▼
┌──────────────────────────────┐
│     DotNotationParser        │  ← Static utility
│  get / has / set / remove    │
│  parseKeys / buildPath       │
└──────────────────────────────┘

Concrete Accessors (extend AbstractAccessor):
┌──────────┬──────────┬──────────┐
│  Array   │  Object  │  JSON    │
│  XML     │  YAML    │  TOML    │
│  INI     │  CSV     │  ENV     │
└──────────┴──────────┴──────────┘
Each only implements: parse(raw) → array
```

## Data Flow

```
Input (string/array/object)
  → Accessor::from(data)
    → Constructor: raw = data, data = parse(raw)
      → Accessor-specific parsing (JSON.parse, XML parse, etc.)
  → Normalized array stored in $data
  → All operations (get/set/has/etc.) operate on $data via DotNotationParser
```

## DotNotationParser Engine

The parser resolves paths like `user.profile.name` against nested data structures.

**Supported path syntax:**
- `name` — simple key access
- `user.profile.name` — nested access
- `items.0.title` — numeric index access
- `matrix[0][1]` — bracket notation (converted to dot notation)
- `users.*.name` — wildcard (returns array of all matching values)
- `config\.db.host` — escaped dot (literal dot in key name)

**Resolution algorithm:**
1. Parse path into key segments via `parseKeys()`
2. Walk the data structure segment by segment
3. On `*` wildcard: iterate all children, recursively resolve remaining path
4. On escaped dot: treat as literal key name
5. Return default value if any segment is not found

## Immutability Pattern

```
$original = SafeAccess::fromJson('{"a": 1}');
$modified = $original->set('b', 2);

// $original->data = ['a' => 1]     ← unchanged
// $modified->data = ['a' => 1, 'b' => 2]  ← new instance
```

Implementation:
- PHP: `clone $this` + update `$data`
- JS: `clone(newData)` method creates a new instance with modified data

## TypeDetector

Auto-detection priority (first match wins):
1. **Array** → `ArrayAccessor`
2. **SimpleXMLElement** (PHP only) → `XmlAccessor`
3. **Object** → `ObjectAccessor`
4. **JSON string** (`{` or `[`) → `JsonAccessor`
5. **XML string** (`<?xml` or `<`) → `XmlAccessor`
6. **YAML string** (contains `: ` value pairs or `---` front-matter) → `YamlAccessor`
7. **INI string** (has `[section]` or `key = value`) → `IniAccessor`
8. **ENV string** (`KEY=VALUE` pattern) → `EnvAccessor`
9. **Unsupported** → throws `UnsupportedTypeException`

## Monorepo Structure

```
safe-access-inline/
├── packages/
│   ├── php/                 # Composer package
│   │   ├── src/
│   │   │   ├── Contracts/   # Interfaces
│   │   │   ├── Core/        # AbstractAccessor, DotNotationParser, TypeDetector
│   │   │   ├── Accessors/   # 9 format accessors
│   │   │   ├── Traits/      # HasFactory, HasTransformations, HasWildcardSupport
│   │   │   ├── Exceptions/  # Exception hierarchy
│   │   │   └── SafeAccess.php
│   │   └── tests/
│   └── js/                  # npm package
│       ├── src/
│       │   ├── core/        # AbstractAccessor, DotNotationParser, TypeDetector
│       │   ├── accessors/   # 9 format accessors
│       │   ├── exceptions/  # Error hierarchy
│       │   ├── safe-access.ts
│       │   └── index.ts     # Barrel export
│       └── tests/
├── docs/                    # Documentation
├── .github/workflows/       # CI/CD
├── CHANGELOG.md
├── LICENSE
└── README.md
```

## Architecture Decision Records

### ADR-1: `set()` / `remove()` use `clone` instead of `static::from()`

**Context:** The PLAN.md specifies `set()` returns `static::from($newData)`. However, some accessors
carry metadata beyond the normalized array — for example, `XmlAccessor` stores the `originalXml` string.

**Decision:** Both PHP and JS use `clone` (PHP: `clone $this`; JS: `clone(newData)` method) to preserve
any accessor-specific metadata when producing a new instance. Only `$data` is updated.

**Consequence:** Metadata like `originalXml` survives mutations, which is the expected behavior. The
round-trip `set() → toXml()` can still access the original XML via `getOriginalXml()`.

### ADR-2: JS omits `toXml()` / `toYaml()` output methods

**Context:** PHP's `HasTransformations` trait provides `toXml()` and `toYaml()` alongside `toArray()`,
`toJson()`, and `toObject()`. These rely on PHP built-ins (`SimpleXMLElement`) or optional extensions
(`symfony/yaml`, `ext-yaml`).

**Decision:** The JS package only exposes `toArray()`, `toJson()`, and `toObject()`. XML and YAML
serialization are intentionally omitted because:
- JavaScript has no native XML emitter equivalent to `SimpleXMLElement`.
- YAML serialization would require a runtime dependency (e.g., `js-yaml`), contradicting the
  zero-dependency design principle.

**Consequence:** Users who need XML or YAML output in JS should use `toObject()` and feed the result
to their preferred serialization library (e.g., `fast-xml-parser`, `js-yaml`).
