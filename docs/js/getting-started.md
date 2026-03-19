---
outline: deep
---

# Getting Started — JavaScript / TypeScript

## Table of Contents

- [Requirements](#requirements)
- [Installation](#installation)
- [Basic Usage](#basic-usage)
- [Plugin System](#plugin-system)

---

## Requirements

- Node.js 24 or higher
- TypeScript 5.5+ (for TypeScript projects)

## Installation

```bash
npm install @safe-access-inline/safe-access-inline
```

## Basic Usage

### Accessing data with dot notation

```typescript
import { SafeAccess } from "@safe-access-inline/safe-access-inline";

const json = '{"user": {"profile": {"name": "Ana", "age": 30}}}';
const accessor = SafeAccess.fromJson(json);

// Simple access
accessor.get("user.profile.name"); // "Ana"
accessor.get("user.profile.age"); // 30

// Safe access — never throws, returns default
accessor.get("user.email", "N/A"); // "N/A"
accessor.get("nonexistent.path"); // null (default)

// Check existence
accessor.has("user.profile.name"); // true
accessor.has("user.email"); // false
```

### Working with arrays and objects

```typescript
const data = {
    users: [
        { name: "Ana", role: "admin" },
        { name: "Bob", role: "user" },
        { name: "Carol", role: "user" },
    ],
};

const accessor = SafeAccess.fromObject(data);

// Access by index
accessor.get("users.0.name"); // "Ana"
accessor.get("users.2.role"); // "user"

// Wildcard — get all matching values
accessor.get("users.*.name"); // ["Ana", "Bob", "Carol"]
accessor.get("users.*.role"); // ["admin", "user", "user"]
```

### Immutable modifications

```typescript
const accessor = SafeAccess.fromJson('{"name": "Ana", "age": 30}');

// set() returns a NEW instance
const modified = accessor.set("email", "ana@example.com");
modified.get("email"); // "ana@example.com"
accessor.get("email"); // null (original unchanged)

// remove() also returns a new instance
const cleaned = accessor.remove("age");
cleaned.has("age"); // false
accessor.has("age"); // true (original unchanged)
```

### Format auto-detection

```typescript
const arr = SafeAccess.detect([1, 2, 3]); // ArrayAccessor
const obj = SafeAccess.detect({ key: "value" }); // ObjectAccessor
const json = SafeAccess.detect('{"key": "value"}'); // JsonAccessor
```

### Cross-format transformation

```typescript
const accessor = SafeAccess.fromJson('{"name": "Ana", "age": 30}');

accessor.toArray(); // { name: "Ana", age: 30 }
accessor.toObject(); // deep clone as plain object
accessor.toJson(); // '{"name":"Ana","age":30}'
accessor.toJson(true); // pretty-printed JSON

// YAML and TOML work zero-config (powered by js-yaml and smol-toml)
accessor.toYaml(); // "name: Ana\nage: 30\n"
accessor.toToml(); // 'name = "Ana"\nage = 30\n'
accessor.toXml("person"); // uses built-in serializer (plugin can override)
accessor.transform("yaml"); // delegates to toYaml() — no plugin needed
```

> **Note:** `toYaml()`, `toToml()`, and `toXml()` work out of the box. `transform()` also falls back to built-in serializers for `yaml`, `toml`, and `csv`. For custom formats, register a serializer plugin via `PluginRegistry`.

---

## Plugin System

YAML and TOML work out of the box using `js-yaml` and `smol-toml`. The Plugin System lets you override default parsers and serializers with custom implementations.

See the [Plugin System](/js/plugins) page for full documentation, shipped plugins, custom examples, and testing utilities.
