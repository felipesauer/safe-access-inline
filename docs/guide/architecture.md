---
outline: deep
---

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
- [Security Architecture](#security-architecture)
- [I/O & File Loading](#io--file-loading)
- [Schema Validation](#schema-validation)
- [Audit System](#audit-system)
- [CLI Package](#cli-package)
- [Framework Integrations](#framework-integrations)
- [Architecture Decision Records](#architecture-decision-records)

## Overview

safe-access-inline is a format-agnostic data access library that provides a single API for safely reading, writing, and transforming deeply nested data structures. It follows the **Facade pattern** with a pluggable accessor system and an extensible **Plugin Registry** for format parsing and serialization.

## Design Principles

1. **Zero Surprises** — `get()` never throws exceptions. Missing paths return a default value.
2. **Format-Agnostic** — The same API works identically across all supported formats.
3. **Immutability** — `set()` and `remove()` always return new instances; the original is never mutated.
4. **Real Dependencies for Complex Formats** — YAML and TOML use real libraries (`js-yaml`/`smol-toml` in JS, `symfony/yaml`/`devium/toml` in PHP) as dependencies. The Plugin System provides optional override capability.
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
│  toYaml / toToml / transform │
│  type / count / keys / all   │
│  push / pop / shift / insert │  ← Array operations
│  diff / applyPatch           │  ← JSON Patch (RFC 6902)
│  masked / validate           │  ← Security & schema
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
│  NDJSON  │          │          │
└──────────┴──────────┴──────────┘
Each only implements: parse(raw) → array
(YAML/TOML use real libraries by default, with optional PluginRegistry override)
```

## Plugin System

The Plugin System provides **optional override** capability for format-specific parsing and serialization. YAML and TOML use real libraries by default — plugins let users swap in alternative implementations.

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

| Aspect                                                   | PHP                                                                                                                                  | JS/TS                                                                             |
| -------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------- |
| YAML/TOML parsing                                        | Real library by default (`ext-yaml` or `symfony/yaml` for YAML, `devium/toml` for TOML); plugin **optional** (overrides)             | Real library by default (`js-yaml`, `smol-toml`); plugin **optional** (overrides) |
| Serialization (`toYaml`, `toToml`, `toXml`, `transform`) | Plugin override → `ext-yaml`/real library fallback (with `SimpleXMLElement` fallback for XML)                                        | Real library by default for YAML/TOML; plugin required for XML                    |
| Shipped plugins                                          | 6 plugins (SymfonyYamlParser, SymfonyYamlSerializer, NativeYamlParser, NativeYamlSerializer, DeviumTomlParser, DeviumTomlSerializer) | 4 plugins (JsYamlParser, JsYamlSerializer, SmolTomlParser, SmolTomlSerializer)    |

## Data Flow

```
Input (string/array/object)
  → Accessor::from(data)
    → Constructor: raw = data, data = parse(raw)
      → For most formats: accessor-specific parsing (JSON.parse, XML parse, etc.)
      → For YAML (PHP): PluginRegistry override → ext-yaml (yaml_parse) → Symfony\Yaml fallback
      → For TOML (PHP): PluginRegistry override → Devium\Toml default
      → For YAML/TOML (JS): PluginRegistry override → real library default (js-yaml / smol-toml)
  → Normalized array stored in $data / this.data
  → All read operations (get/set/has/etc.) operate on data via DotNotationParser
  → Transformation methods:
      → toArray() / toJson() / toObject() — built-in, always available
      → toXml() — built-in in PHP (SimpleXMLElement), plugin-based in JS
      → toYaml() — Plugin override → ext-yaml (yaml_emit) → symfony/yaml fallback in PHP; js-yaml default in JS
      → toToml() — Plugin override → devium/toml default in PHP; smol-toml default in JS
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
5. **NDJSON string** (multiple `{...}` lines) → `NdjsonAccessor`
6. **XML string** (`<?xml` or `<`) → `XmlAccessor`
7. **YAML string** (contains `: ` value pairs or `---` front-matter) → `YamlAccessor`
8. **INI string** (has `[section]` or `key = value`) → `IniAccessor`
9. **ENV string** (`KEY=VALUE` pattern) → `EnvAccessor`
10. **Unsupported** → throws `UnsupportedTypeError` / `UnsupportedTypeException`

> **Limitations:** TOML and CSV are not auto-detected due to format ambiguity. The YAML heuristic (`key:` pattern without `=`) may produce false positives for non-YAML strings. Always prefer explicit factory methods (e.g., `fromYaml()`, `fromToml()`) for ambiguous inputs.

## Monorepo Structure

```
safe-access-inline/
├── packages/
│   ├── php/                 # Composer package
│   │   ├── src/
│   │   │   ├── Accessors/   # 10 format accessors (incl. NDJSON)
│   │   │   ├── Contracts/   # Interfaces (incl. ParserPlugin, SerializerPlugin, SchemaAdapter)
│   │   │   ├── Core/        # AbstractAccessor, DotNotationParser, PathCache, TypeDetector, PluginRegistry, SchemaRegistry, JsonPatch, IoLoader, FileWatcher, DeepMerger
│   │   │   ├── Enums/       # AccessorFormat enum
│   │   │   ├── Exceptions/  # Exception hierarchy (incl. SecurityException, SchemaValidationException, ReadonlyViolationException)
│   │   │   ├── Integrations/# LaravelServiceProvider, SymfonyIntegration
│   │   │   ├── Plugins/     # Shipped plugins (SymfonyYaml*, NativeYaml*, DeviumToml*)
│   │   │   ├── Security/    # SecurityPolicy, SecurityOptions, SecurityGuard, CsvSanitizer, DataMasker, AuditLogger
│   │   │   ├── Traits/      # HasFactory, HasTransformations, HasWildcardSupport
│   │   │   └── SafeAccess.php
│   │   └── tests/
│   │       ├── Unit/        # Mock-based unit tests
│   │       └── Integration/ # Real parser integration tests
│   ├── js/                  # npm package
│   │   ├── src/
│   │   │   ├── accessors/   # 10 format accessors (incl. NDJSON)
│   │   │   ├── contracts/   # TypeScript interfaces
│   │   │   ├── core/        # AbstractAccessor, DotNotationParser, PathCache, TypeDetector, PluginRegistry, SchemaRegistry, JsonPatch, IoLoader, FileWatcher, DeepMerger, AuditEmitter
│   │   │   ├── exceptions/  # Error hierarchy (incl. SecurityError, SchemaValidationError, ReadonlyViolationError)
│   │   │   ├── integrations/# NestJS module, Vite plugin
│   │   │   ├── plugins/     # Shipped plugins (JsYaml*, SmolToml*)
│   │   │   ├── types/       # DeepPaths, ValueAtPath utility types
│   │   │   ├── safe-access.ts
│   │   │   └── index.ts     # Barrel export
│   │   └── tests/
│   │       ├── unit/        # Mock-based unit tests
│   │       └── integration/ # Cross-format pipeline tests
│   └── cli/                 # CLI package (@safe-access-inline/cli)
│       ├── src/cli.ts       # CLI entry point (get, set, remove, transform, diff, mask, layer, keys, type, has, count)
│       └── tests/
├── docs/                    # Documentation (Jekyll, English + pt-BR)
├── .github/workflows/       # CI/CD
├── CHANGELOG.md
├── CODE_OF_CONDUCT.md
├── CONTRIBUTING.md
├── LICENSE
├── SECURITY.md
└── README.md
```

## Security Architecture

The security module provides defense-in-depth for data processing:

```
┌─────────────────────────────────────────────────────────┐
│                    SecurityPolicy                       │
│  maxDepth, maxPayloadBytes, maxKeys, allowedDirs,       │
│  url options, csvMode, maskPatterns                     │
└──────────┬──────────────────────────────────────────────┘
           │ delegates to
     ┌─────┴─────────┬──────────────┬────────────────┐
     ▼               ▼              ▼                ▼
┌──────────┐  ┌──────────────┐ ┌───────────┐  ┌───────────┐
│ Security │  │    IoLoader   │ │   CSV     │  │   Data    │
│ Options  │  │  path/URL    │ │ Sanitizer │  │  Masker   │
│ (limits) │  │  validation  │ │           │  │           │
└──────────┘  └──────────────┘ └───────────┘  └───────────┘
```

- **SecurityPolicy** — Immutable aggregate of all security settings. Supports `merge()` for creating derived policies.
- **SecurityOptions** — Static assertion methods for payload size, key count, and nesting depth limits.
- **SecurityGuard** — Blocks prototype pollution keys (`__proto__`, `constructor`, `prototype`, `__defineGetter__`, `__defineSetter__`, `__lookupGetter__`, `__lookupSetter__`, `valueOf`, `toString`, `hasOwnProperty`, `isPrototypeOf`). Sanitizes objects recursively.
- **IoLoader** — Path-traversal protection for file reads. SSRF protection for URL fetches (blocks private IPs, cloud metadata, enforces HTTPS).
- **CsvSanitizer** — Guards against CSV injection attacks with configurable modes (none, prefix, strip, error).
- **DataMasker** — Replaces sensitive values (password, token, secret, etc.) with `[REDACTED]`. Supports custom glob/regex patterns.

## I/O & File Loading

File and URL loading follow a secure pipeline:

1. **Path validation** — Resolved path must be within `allowedDirs` (if specified)
2. **Format detection** — Extension-based (`resolveFormatFromExtension`)
3. **Content reading** — File system or HTTPS fetch
4. **Audit emission** — `file.read` or `url.fetch` event
5. **Accessor creation** — Delegated to the appropriate `SafeAccess.from*()` method

File watching uses polling (`FileWatcher`) — checks mtime at configurable intervals. Returns a stop function for cleanup.

- **PathCache** — LRU in-memory cache layered between `AbstractAccessor` and `DotNotationParser`. Parsed path segment arrays are stored keyed by path string, eliminating redundant re-parsing on repeated hot-path accesses.

Layered configuration (`layer()`, `layerFiles()`) deep-merges multiple sources with last-wins semantics.

## Schema Validation

Schema validation uses the **Adapter pattern** to remain library-agnostic:

```
┌───────────────────┐     ┌────────────────────────┐
│  SchemaRegistry   │────▶│  SchemaAdapterInterface │
│  default adapter  │     │  validate(data, schema) │
└───────────────────┘     └────────────┬───────────┘
                                       │ returns
                                       ▼
                          ┌────────────────────────┐
                          │ SchemaValidationResult  │
                          │  valid: bool            │
                          │  errors: Issue[]        │
                          └────────────────────────┘
```

Users implement `SchemaAdapterInterface` with their preferred validation library (Zod, Joi, JSON Schema, etc.) and register it via `SchemaRegistry.setDefaultAdapter()`.

## Audit System

The audit system provides observability for security-relevant operations:

- **Event types:** `file.read`, `file.watch`, `url.fetch`, `security.violation`, `data.mask`, `data.freeze`, `schema.validate`
- **Subscription:** `SafeAccess.onAudit(listener)` returns an unsubscribe function
- **Emission:** Internal — triggered automatically by IoLoader, DataMasker, schema validation, etc.
- **Design:** Pub/sub pattern. Listeners are synchronous. Events include `type`, `timestamp`, and `detail` fields.

## CLI Package

The `@safe-access-inline/cli` package provides command-line access to all library features:

| Command     | Description                                  |
| ----------- | -------------------------------------------- |
| `get`       | Read a value by path                         |
| `set`       | Set a value at a path                        |
| `remove`    | Remove a value at a path                     |
| `transform` | Convert between formats (JSON ↔ YAML ↔ TOML) |
| `diff`      | Generate JSON Patch diff between two files   |
| `mask`      | Redact sensitive values                      |
| `layer`     | Merge multiple config files                  |
| `keys`      | List keys at a path                          |
| `type`      | Show the type of a value at a path           |
| `has`       | Check path existence (exit code 0/1)         |
| `count`     | Count elements at a path                     |

Supports stdin input (`-`), all formats (JSON, YAML, TOML, XML, INI, CSV, ENV, NDJSON), pretty output, and path expressions.

## Framework Integrations

| Framework | Package | Module                   | Features                                        |
| --------- | ------- | ------------------------ | ----------------------------------------------- |
| NestJS    | JS      | `SafeAccessModule`       | Dynamic module, `SAFE_ACCESS` injection token   |
| Vite      | JS      | `safeAccessPlugin`       | Virtual module, HMR support, multi-file merging |
| Laravel   | PHP     | `LaravelServiceProvider` | Singleton binding, config repository wrapping   |
| Symfony   | PHP     | `SymfonyIntegration`     | ParameterBag wrapping, YAML file loading        |

## Architecture Decision Records

### ADR-1: `set()` / `remove()` use `clone` instead of `static::from()`

**Context:** The PLAN.md specifies `set()` returns `static::from($newData)`. However, some accessors
carry metadata beyond the normalized array — for example, `XmlAccessor` stores the `originalXml` string.

**Decision:** Both PHP and JS use `clone` (PHP: `clone $this`; JS: `clone(newData)` method) to preserve
any accessor-specific metadata when producing a new instance. Only `$data` is updated.

**Consequence:** Metadata like `originalXml` survives mutations, which is the expected behavior. The
round-trip `set() → toXml()` can still access the original XML via `getOriginalXml()`.

### ADR-2: JS `toXml()` / `toYaml()` / `toToml()` via Real Libraries + Plugin Override

**Context:** Initially, the JS package omitted `toXml()` and `toYaml()` because JavaScript has no native XML emitter and YAML serialization would require a runtime dependency.

**Decision (original):** JS only exposed `toArray()`, `toJson()`, and `toObject()`.

**Decision (revised #1):** With the introduction of the Plugin System, JS exposed `toYaml()`, `toXml()`, and `transform()` via PluginRegistry.

**Decision (revised #2):** `js-yaml` and `smol-toml` are now real `dependencies`. `toYaml()` and `toToml()` work zero-config using these libraries. Plugins provide optional override for users who need different libraries. `toXml()` still requires a plugin.

**Consequence:** YAML and TOML serialization works out of the box. Users who need alternative serializers register a plugin override. XML serialization still requires explicit plugin registration.

### ADR-3: Real Dependencies for YAML/TOML + PluginRegistry for Override

**Context:** PHP's YAML and TOML accessors originally used `class_exists()` and `function_exists()` checks to detect available parsers at runtime. Later, a PluginRegistry was introduced that required manual plugin registration. Both PHP and JS had different approaches: PHP required plugins, JS had built-in lightweight parsers.

**Decision:** Make YAML/TOML libraries real dependencies in both platforms. `js-yaml` + `smol-toml` are `dependencies` in JS. `symfony/yaml` + `devium/toml` are `require` in PHP. PluginRegistry continues to exist for override: if a plugin is registered, it takes priority over the default library.

**Key design choices:**

- **Both platforms**: YAML/TOML parsing and serialization work out of the box — zero configuration needed.
- **Plugin override**: `PluginRegistry.registerParser()` / `PluginRegistry.registerSerializer()` still works — registered plugins take priority over default libraries.
- **JS built-in parsers removed**: The old lightweight YAML/TOML parsers were removed in favor of proven libraries (`js-yaml`, `smol-toml`).
- **Exception types**: `InvalidFormatException` at the accessor level, `UnsupportedTypeException` at the registry level.
- **Testing**: Unit tests use mock plugins (anonymous classes/objects) for isolation. Integration tests use real libraries.

**Consequence:** Zero configuration for YAML/TOML in both platforms. Consistent behavior between PHP and JS. Users who need alternative parsers/serializers register them via PluginRegistry.
