# Architecture

## Table of Contents

- [Overview](#overview)
- [Design Principles](#design-principles)
- [Component Diagram](#component-diagram)
- [Plugin System](#plugin-system)
- [Data Flow](#data-flow)
- [DotNotationParser Engine](#dotnotationparser-engine)
- [Immutability Pattern](#immutability-pattern)
- [TypeDetector](#typedetector)
- [Monorepo Structure](#monorepo-structure)
- [Architecture Decision Records](#architecture-decision-records)

## Overview

safe-access-inline is a format-agnostic data access library that provides a single API for safely reading, writing, and transforming deeply nested data structures. It follows the **Facade pattern** with a pluggable accessor system and an extensible **Plugin Registry** for format parsing and serialization.

## Design Principles

1. **Zero Surprises** — `get()` never throws exceptions. Missing paths return a default value.
2. **Format-Agnostic** — The same API works identically across all supported formats.
3. **Immutability** — `set()` and `remove()` always return new instances; the original is never mutated.
4. **Zero Dependencies** — The core library has no external runtime dependencies. Format-specific parsers are registered via the Plugin System.
5. **Extensibility** — Custom accessors via `SafeAccess::extend()`, custom parsers and serializers via `PluginRegistry`.

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
│  toYaml / transform          │
│  type / count / keys / all   │
└──────────┬───────────────────┘
           │
     ┌─────┴─────────────────────┐
     │ delegates path            │ delegates serialization
     │ resolution to             │ & parsing to
     ▼                           ▼
┌────────────────────┐   ┌────────────────────────┐
│  DotNotationParser │   │    PluginRegistry       │
│  get / has / set   │   │  registerParser()       │
│  remove / parseKeys│   │  registerSerializer()   │
│  buildPath         │   │  getParser / has / get  │
└────────────────────┘   └────────┬───────────────┘
                                  │ stores
                     ┌────────────┼────────────────┐
                     ▼            ▼                ▼
              ┌───────────┐ ┌──────────────┐ ┌──────────┐
              │  Parsers   │ │ Serializers  │ │ Custom   │
              │  yaml,toml │ │ yaml,xml,... │ │ plugins  │
              └───────────┘ └──────────────┘ └──────────┘

Concrete Accessors (extend AbstractAccessor):
┌──────────┬──────────┬──────────┐
│  Array   │  Object  │  JSON    │
│  XML     │  YAML    │  TOML    │
│  INI     │  CSV     │  ENV     │
└──────────┴──────────┴──────────┘
Each only implements: parse(raw) → array
(YAML/TOML delegate parsing to PluginRegistry)
```

## Plugin System

The Plugin System decouples format-specific parsing and serialization from external libraries. Instead of hard-coding `class_exists` checks, accessors query the `PluginRegistry` at runtime.

### Contracts

```
┌───────────────────────────┐     ┌───────────────────────────────┐
│  ParserPluginInterface    │     │  SerializerPluginInterface    │
│  parse(string): array     │     │  serialize(array): string     │
└───────────────────────────┘     └───────────────────────────────┘
```

- **`ParserPluginInterface`** — receives a raw string input (e.g., YAML text), returns a normalized associative array. Throws `InvalidFormatException` on malformed input.
- **`SerializerPluginInterface`** — receives a normalized array, returns a formatted string output (e.g., YAML text).

### PluginRegistry

A static registry that maps format names (e.g., `'yaml'`, `'toml'`) to parser and serializer implementations.

```
PluginRegistry::registerParser('yaml', new SymfonyYamlParser());
PluginRegistry::registerSerializer('yaml', new SymfonyYamlSerializer());

// Accessors query the registry:
// YamlAccessor::parse() → PluginRegistry::getParser('yaml')->parse($raw)
// $accessor->toYaml()   → PluginRegistry::getSerializer('yaml')->serialize($data)
// $accessor->transform('yaml') → same as toYaml()
```

### PHP vs JS Behavior

| Aspect | PHP | JS/TS |
|--------|-----|-------|
| YAML/TOML parsing | Plugin **required** — no built-in parser | Built-in lightweight parser; plugin **optional** (overrides built-in) |
| Serialization (`toYaml`, `toXml`, `transform`) | Via PluginRegistry (with `yaml_emit` fallback for YAML, `SimpleXMLElement` fallback for XML) | Via PluginRegistry only — no built-in serializers |
| Shipped plugins | 4 plugins (SymfonyYamlParser, SymfonyYamlSerializer, NativeYamlParser, DeviumTomlParser) | None shipped — users register their own |

## Data Flow

```
Input (string/array/object)
  → Accessor::from(data)
    → Constructor: raw = data, data = parse(raw)
      → For most formats: accessor-specific parsing (JSON.parse, XML parse, etc.)
      → For YAML/TOML (PHP): PluginRegistry::getParser(format)->parse(raw)
      → For YAML/TOML (JS): PluginRegistry.hasParser(format) ? plugin : built-in parser
  → Normalized array stored in $data / this.data
  → All read operations (get/set/has/etc.) operate on data via DotNotationParser
  → Transformation methods:
      → toArray() / toJson() / toObject() — built-in, always available
      → toXml() — built-in in PHP (SimpleXMLElement), plugin-based in JS
      → toYaml() — plugin-based (PluginRegistry), with yaml_emit() fallback in PHP
      → transform(format) — always delegates to PluginRegistry::getSerializer(format)
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
- JS: `clone(newData)` method creates a new instance with modified data (via `structuredClone`)

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
│   │   │   ├── Accessors/   # 9 format accessors
│   │   │   ├── Contracts/   # Interfaces (incl. ParserPlugin, SerializerPlugin)
│   │   │   ├── Core/        # AbstractAccessor, DotNotationParser, TypeDetector, PluginRegistry
│   │   │   ├── Exceptions/  # Exception hierarchy
│   │   │   ├── Plugins/     # Shipped plugins (SymfonyYaml*, NativeYaml*, DeviumToml*)
│   │   │   ├── Traits/      # HasFactory, HasTransformations, HasWildcardSupport
│   │   │   └── SafeAccess.php
│   │   └── tests/
│   │       ├── Unit/        # Mock-based unit tests
│   │       └── Integration/ # Real parser integration tests
│   └── js/                  # npm package
│       ├── src/
│       │   ├── accessors/   # 9 format accessors
│       │   ├── contracts/   # TypeScript interfaces
│       │   ├── core/        # AbstractAccessor, DotNotationParser, TypeDetector, PluginRegistry
│       │   ├── exceptions/  # Error hierarchy
│       │   ├── safe-access.ts
│       │   └── index.ts     # Barrel export
│       └── tests/
│           ├── unit/        # Mock-based unit tests
│           └── integration/ # Cross-format pipeline tests
├── docs/                    # Documentation
├── .github/workflows/       # CI/CD
├── CHANGELOG.md
├── CODE_OF_CONDUCT.md
├── CONTRIBUTING.md
├── LICENSE
├── SECURITY.md
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

### ADR-2: JS `toXml()` / `toYaml()` via Plugin System *(revised)*

**Context:** Initially, the JS package omitted `toXml()` and `toYaml()` because JavaScript has no native XML emitter and YAML serialization would require a runtime dependency, contradicting the zero-dependency principle.

**Decision (original):** JS only exposed `toArray()`, `toJson()`, and `toObject()`.

**Decision (revised):** With the introduction of the Plugin System, JS now exposes `toYaml()`, `toXml()`, and `transform()`. These methods delegate to `PluginRegistry.getSerializer(format)` and throw `UnsupportedTypeError` if no serializer plugin is registered. This preserves the zero-dependency principle — no serialization library is bundled — while giving users a clean API to register their own.

**Consequence:** Users who need YAML or XML output in JS register a serializer plugin (e.g., wrapping `js-yaml` or `fast-xml-parser`), then call `accessor.toYaml()` or `accessor.toXml()` directly. The API is now consistent with PHP.

### ADR-3: Plugin System — PluginRegistry for format parsing and serialization

**Context:** PHP's YAML and TOML accessors originally used `class_exists()` and `function_exists()` checks to detect available parsers at runtime. This created tight coupling to specific libraries and caused tests to be skipped when libraries weren't installed.

**Decision:** Introduce a `PluginRegistry` — a static registry where parsers (`ParserPluginInterface` / `ParserPlugin`) and serializers (`SerializerPluginInterface` / `SerializerPlugin`) are registered by format name. Accessors query the registry instead of checking for classes directly.

**Key design choices:**
- **PHP**: YAML/TOML parsing is fully delegated to plugins — no built-in parser. This ensures the library has zero external dependencies.
- **JS**: Built-in lightweight parsers are kept as defaults for YAML/TOML. Plugins are optional overrides for users who need more robust parsing.
- **Serialization**: Always via PluginRegistry in both languages (with `yaml_emit()` and `SimpleXMLElement` fallbacks in PHP).
- **Exception types**: `InvalidFormatException` at the accessor level, `UnsupportedTypeException` at the registry level.
- **Testing**: Unit tests use mock plugins (anonymous classes/objects), eliminating test skips. Integration tests with real libraries skip if not installed.

**Consequence:** Zero skipped unit tests for YAML/TOML. Clean separation of concerns. Users can register any parser library without modifying library source code.
