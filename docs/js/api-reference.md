---
title: API Reference
parent: JavaScript / TypeScript
nav_order: 2
permalink: /js/api-reference/
---

# API Reference — JavaScript / TypeScript

## Table of Contents

- [SafeAccess Facade](#safeaccess-facade)
- [Accessor Instance Methods](#accessor-instance-methods)
- [PluginRegistry](#pluginregistry)
- [DotNotationParser](#dotnotationparser)
- [Errors](#errors)
- [TypeScript Types](#typescript-types)
- [Enums](#enums)

---

## SafeAccess Facade

**Import:** `import { SafeAccess } from '@safe-access-inline/safe-access-inline'`

### Factory Methods

#### `SafeAccess.fromArray(data: unknown[]): ArrayAccessor`

Creates an accessor from an array or object.

```typescript
const accessor = SafeAccess.fromArray([{ name: "Ana" }, { name: "Bob" }]);
```

#### `SafeAccess.fromObject(data: Record<string, unknown>): ObjectAccessor`

Creates an accessor from a plain object.

```typescript
const accessor = SafeAccess.fromObject({ name: "Ana", age: 30 });
```

#### `SafeAccess.fromJson(data: string): JsonAccessor`

Creates an accessor from a JSON string.

```typescript
const accessor = SafeAccess.fromJson('{"name": "Ana"}');
```

#### `SafeAccess.fromXml(data: string): XmlAccessor`

Creates an accessor from an XML string.

```typescript
const accessor = SafeAccess.fromXml("<root><name>Ana</name></root>");
```

#### `SafeAccess.fromYaml(data: string): YamlAccessor`

Creates an accessor from a YAML string. Uses `js-yaml` by default. If a parser plugin is registered via `PluginRegistry`, the plugin takes precedence.

```typescript
const accessor = SafeAccess.fromYaml("name: Ana\nage: 30");
```

#### `SafeAccess.fromToml(data: string): TomlAccessor`

Creates an accessor from a TOML string. Uses `smol-toml` by default. If a parser plugin is registered via `PluginRegistry`, the plugin takes precedence.

```typescript
const accessor = SafeAccess.fromToml('name = "Ana"');
```

#### `SafeAccess.fromIni(data: string): IniAccessor`

Creates an accessor from an INI string.

```typescript
const accessor = SafeAccess.fromIni("[section]\nkey = value");
```

#### `SafeAccess.fromCsv(data: string): CsvAccessor`

Creates an accessor from a CSV string (first line = headers).

```typescript
const accessor = SafeAccess.fromCsv("name,age\nAna,30");
```

#### `SafeAccess.fromEnv(data: string): EnvAccessor`

Creates an accessor from a `.env` format string.

```typescript
const accessor = SafeAccess.fromEnv("APP_NAME=MyApp\nDEBUG=true");
```

#### `SafeAccess.from(data: unknown, format?: string | Format): AbstractAccessor`

Unified factory — creates an accessor from any data. With a format string or `Format` enum value, delegates to the corresponding typed factory. Without a format, auto-detects (same as `detect()`).

Supported formats: `'array'`, `'object'`, `'json'`, `'xml'`, `'yaml'`, `'toml'`, `'ini'`, `'csv'`, `'env'`, or any custom name registered via `extend()`. All built-in formats are also available as `Format` enum members.

TypeScript overloads preserve the specific return type for each known format — both string literals and `Format` enum values are fully typed.

```typescript
import { SafeAccess, Format } from "@safe-access-inline/safe-access-inline";

// Auto-detect (no format)
const accessor = SafeAccess.from('{"name": "Ana"}'); // JsonAccessor

// Explicit format via string
const json = SafeAccess.from('{"name": "Ana"}', "json"); // JsonAccessor
const yaml = SafeAccess.from("name: Ana", "yaml"); // YamlAccessor

// Explicit format via enum
const json2 = SafeAccess.from('{"name": "Ana"}', Format.Json); // JsonAccessor
const yaml2 = SafeAccess.from("name: Ana", Format.Yaml); // YamlAccessor
const xml = SafeAccess.from("<root><n>1</n></root>", Format.Xml); // XmlAccessor
const arr = SafeAccess.from([1, 2, 3], Format.Array); // ArrayAccessor

// Custom format (string only)
SafeAccess.extend("custom", MyAccessor);
const custom = SafeAccess.from(data, "custom");
```

Throws `InvalidFormatError` if the format is unknown and not registered.

#### `SafeAccess.detect(data: unknown): AbstractAccessor`

Auto-detects the format and creates the appropriate accessor.

Detection priority: array → object → JSON string → XML string → YAML string → INI string → ENV string.

```typescript
const accessor = SafeAccess.detect({ key: "value" }); // ObjectAccessor
const fromJson = SafeAccess.detect('{"name": "Ana"}'); // JsonAccessor
const fromXml = SafeAccess.detect("<root><name>Ana</name></root>"); // XmlAccessor
const fromYaml = SafeAccess.detect("name: Ana\nage: 30"); // YamlAccessor
```

#### `SafeAccess.extend(name: string, cls: Constructor): void`

Registers a custom accessor class.

```typescript
SafeAccess.extend("custom", MyAccessor);
```

#### `SafeAccess.custom(name: string, data: unknown): AbstractAccessor`

Instantiates a previously registered custom accessor.

```typescript
const accessor = SafeAccess.custom("custom", data);
```

---

## Accessor Instance Methods

All accessors extend `AbstractAccessor` and implement the `AccessorInterface`.

### Reading

#### `get(path: string, defaultValue?: unknown): unknown`

Access a value via dot notation path. **Never throws** — returns `defaultValue` (default: `null`) if path not found.

```typescript
accessor.get("user.name"); // value or null
accessor.get("user.email", "N/A"); // value or 'N/A'
accessor.get("users.*.name"); // array of values (wildcard)
accessor.get("users[?role=='admin'].name"); // filtered values
accessor.get("..name"); // recursive descent
```

#### `getMany(paths: Record<string, unknown>): Record<string, unknown>`

Get multiple values at once. Keys are paths, values are defaults.

```typescript
accessor.getMany({
    "user.name": "Unknown",
    "user.email": "N/A",
});
// { 'user.name': 'Ana', 'user.email': 'N/A' }
```

#### `has(path: string): boolean`

Check if a path exists in the data.

```typescript
accessor.has("user.name"); // true
accessor.has("missing"); // false
```

#### `type(path: string): string | null`

Returns the JavaScript type of the value at the given path, or `null` if path doesn't exist.

Possible values: `"string"`, `"number"`, `"boolean"`, `"object"`, `"array"`, `"null"`, `"undefined"`.

```typescript
accessor.type("name"); // "string"
accessor.type("age"); // "number"
accessor.type("tags"); // "array"
accessor.type("x"); // null
```

#### `count(path?: string): number`

Count elements at path (or root).

```typescript
accessor.count(); // root element count
accessor.count("items"); // count of items
```

#### `keys(path?: string): string[]`

List keys at path (or root).

```typescript
accessor.keys(); // ['name', 'age', 'items']
```

#### `all(): Record<string, unknown>`

Returns all data as a shallow copy. Semantic intent: "give me everything as-is".

```typescript
accessor.all(); // { name: 'Ana', age: 30, ... }
```

### Writing (Immutable)

#### `set(path: string, value: unknown): AbstractAccessor`

Returns a **new instance** with the value set at the given path.

```typescript
const newAccessor = accessor.set("user.email", "ana@example.com");
// accessor is unchanged, newAccessor has the value
```

#### `merge(value: Record<string, unknown>): AbstractAccessor`

#### `merge(path: string, value: Record<string, unknown>): AbstractAccessor`

Deep merges data at root or at a specific path. Returns a **new instance**. Objects are merged recursively; arrays and scalars are replaced.

```typescript
// Merge at root
const merged = accessor.merge({ theme: "dark", notifications: true });

// Merge at path
const merged = accessor.merge("user.settings", { theme: "dark" });
```

#### `remove(path: string): AbstractAccessor`

Returns a **new instance** with the given path removed.

```typescript
const newAccessor = accessor.remove("user.age");
// accessor is unchanged, newAccessor has 'age' removed
```

### Transformation

#### `toArray(): Record<string, unknown>`

Returns a shallow copy of the data. Semantic intent: "convert to array/object format". Currently identical to `all()`, but semantically distinct for future extensibility.

#### `toJson(pretty?: boolean): string`

Convert to JSON string.

```typescript
accessor.toJson(); // compact
accessor.toJson(true); // pretty-printed with 2-space indent
```

#### `toObject(): Record<string, unknown>`

Returns a deep clone of the data (via `structuredClone`).

#### `toYaml(): string`

Serializes the data to YAML. Uses `js-yaml` by default. If a `'yaml'` serializer plugin is registered via `PluginRegistry`, the plugin takes precedence.

```typescript
const accessor = SafeAccess.fromJson('{"name": "Ana"}');
accessor.toYaml(); // "name: Ana\n"
```

#### `toToml(): string`

Serializes the data to TOML. Uses `smol-toml` by default. If a `'toml'` serializer plugin is registered via `PluginRegistry`, the plugin takes precedence.

```typescript
const accessor = SafeAccess.fromJson('{"name": "Ana"}');
accessor.toToml(); // 'name = "Ana"\n'
```

#### `toXml(rootElement?: string): string`

Serializes the data to XML. Requires an `'xml'` serializer plugin registered via `PluginRegistry`. Falls back to `UnsupportedTypeError` if no serializer is registered. The `rootElement` parameter (default: `'root'`) is passed internally but the serializer plugin controls the actual output.

```typescript
PluginRegistry.registerSerializer("xml", {
    serialize: (data) => {
        // Your XML serialization logic
        return "<root>...</root>";
    },
});

accessor.toXml();
```

#### `transform(format: string): string`

Serializes the data to any format that has a registered serializer plugin. Throws `UnsupportedTypeError` if no serializer is found for the given format.

```typescript
accessor.transform("yaml"); // uses registered 'yaml' serializer
accessor.transform("csv"); // uses registered 'csv' serializer
```

---

## PluginRegistry

**Import:** `import { PluginRegistry } from '@safe-access-inline/safe-access-inline'`

Central registry for parser and serializer plugins. All methods are static.

### Parser Methods

#### `PluginRegistry.registerParser(format: string, parser: ParserPlugin): void`

Registers a parser plugin for the given format. The plugin must implement `{ parse(raw: string): Record<string, unknown> }`.

```typescript
import type { ParserPlugin } from "@safe-access-inline/safe-access-inline";

const yamlParser: ParserPlugin = {
    parse: (raw) => jsYaml.load(raw) as Record<string, unknown>,
};

PluginRegistry.registerParser("yaml", yamlParser);
```

#### `PluginRegistry.hasParser(format: string): boolean`

Returns `true` if a parser plugin is registered for the format.

#### `PluginRegistry.getParser(format: string): ParserPlugin`

Returns the registered parser plugin. Throws `UnsupportedTypeError` if not found.

### Serializer Methods

#### `PluginRegistry.registerSerializer(format: string, serializer: SerializerPlugin): void`

Registers a serializer plugin for the given format. The plugin must implement `{ serialize(data: Record<string, unknown>): string }`.

```typescript
import type { SerializerPlugin } from "@safe-access-inline/safe-access-inline";

const yamlSerializer: SerializerPlugin = {
    serialize: (data) => jsYaml.dump(data),
};

PluginRegistry.registerSerializer("yaml", yamlSerializer);
```

#### `PluginRegistry.hasSerializer(format: string): boolean`

Returns `true` if a serializer plugin is registered for the format.

#### `PluginRegistry.getSerializer(format: string): SerializerPlugin`

Returns the registered serializer plugin. Throws `UnsupportedTypeError` if not found.

### Utility Methods

#### `PluginRegistry.reset(): void`

Clears all registered parsers and serializers. Useful in test teardowns.

```typescript
afterEach(() => PluginRegistry.reset());
```

---

## DotNotationParser

**Import:** `import { DotNotationParser } from '@safe-access-inline/safe-access-inline'`

Static utility class. Typically used internally, but available for direct use.

#### `DotNotationParser.get(data, path, defaultValue?): unknown`

Supports advanced path expressions:

| Syntax            | Description                                                   | Example                 |
| ----------------- | ------------------------------------------------------------- | ----------------------- |
| `a.b.c`           | Nested key access                                             | `"user.profile.name"`   |
| `a[0]`            | Bracket index                                                 | `"items[0].title"`      |
| `a.*`             | Wildcard — returns array of values                            | `"users.*.name"`        |
| `a[?field>value]` | Filter — returns matching items                               | `"products[?price>20]"` |
| `..key`           | Recursive descent — collects all values of `key` at any depth | `"..name"`              |

**Filter expressions** support:

- Comparison: `==`, `!=`, `>`, `<`, `>=`, `<=`
- Logical: `&&` (AND), `\|\|` (OR)
- Values: numbers, `'strings'`, `true`, `false`, `null`

```typescript
// Filter: all admin users
DotNotationParser.get(data, "users[?role=='admin']");

// Filter with numeric comparison + path continuation
DotNotationParser.get(data, "products[?price>20].name");

// Combined AND
DotNotationParser.get(data, "items[?type=='fruit' && color=='red'].name");

// Recursive descent: all "name" values at any depth
DotNotationParser.get(data, "..name");

// Descent + wildcard
DotNotationParser.get(data, "..items.*.id");

// Descent + filter
DotNotationParser.get(data, "..employees[?active==true].name");
```

#### `DotNotationParser.has(data, path): boolean`

#### `DotNotationParser.set(data, path, value): Record<string, unknown>`

Returns a new object (uses `structuredClone`, does not mutate input).

#### `DotNotationParser.merge(data, path, value): Record<string, unknown>`

Deep merges `value` at the given `path`. When `path` is an empty string, merges at root. Objects are merged recursively; all other values are replaced.

```typescript
const result = DotNotationParser.merge(data, "user.settings", {
    theme: "dark",
});
// Merges { theme: "dark" } into data.user.settings
```

#### `DotNotationParser.remove(data, path): Record<string, unknown>`

Returns a new object (does not mutate input).

---

## Errors

| Error                  | When                                                                                             |
| ---------------------- | ------------------------------------------------------------------------------------------------ |
| `AccessorError`        | Base error class                                                                                 |
| `InvalidFormatError`   | Invalid input format (e.g., malformed JSON, missing parser plugin)                               |
| `PathNotFoundError`    | Reserved (not thrown by `get()`)                                                                 |
| `UnsupportedTypeError` | No serializer/parser plugin registered for the requested format (e.g., `toXml()` without plugin) |

All errors extend the base `Error` class and `AccessorError`.

---

## TypeScript Types

```typescript
interface AccessorInterface {
    get(path: string, defaultValue?: unknown): unknown;
    getMany(paths: Record<string, unknown>): Record<string, unknown>;
    has(path: string): boolean;
    set(path: string, value: unknown): AbstractAccessor;
    remove(path: string): AbstractAccessor;
    type(path: string): string | null;
    count(path?: string): number;
    keys(path?: string): string[];
    all(): Record<string, unknown>;
    toArray(): Record<string, unknown>;
    toJson(pretty?: boolean): string;
    toObject(): Record<string, unknown>;
    toYaml(): string;
    toToml(): string;
    toXml(rootElement?: string): string;
    transform(format: string): string;
}

interface ParserPlugin {
    parse(raw: string): Record<string, unknown>;
}
```

### Shipped Plugins

The package ships with ready-to-use parser and serializer plugins for overriding the default YAML/TOML implementations:

```typescript
import {
    JsYamlParser,
    JsYamlSerializer,
    SmolTomlParser,
    SmolTomlSerializer,
} from "@safe-access-inline/safe-access-inline";
```

| Plugin               | Format | Type       | Library     |
| -------------------- | ------ | ---------- | ----------- |
| `JsYamlParser`       | yaml   | Parser     | `js-yaml`   |
| `JsYamlSerializer`   | yaml   | Serializer | `js-yaml`   |
| `SmolTomlParser`     | toml   | Parser     | `smol-toml` |
| `SmolTomlSerializer` | toml   | Serializer | `smol-toml` |

```typescript
interface SerializerPlugin {
    serialize(data: Record<string, unknown>): string;
}
```

---

## Enums

### `Format`

**Import:** `import { Format } from '@safe-access-inline/safe-access-inline'`

String enum covering all built-in formats. Use it as a type-safe alternative to passing raw strings to `SafeAccess.from()`.

| Member          | Value      |
| --------------- | ---------- |
| `Format.Array`  | `'array'`  |
| `Format.Object` | `'object'` |
| `Format.Json`   | `'json'`   |
| `Format.Xml`    | `'xml'`    |
| `Format.Yaml`   | `'yaml'`   |
| `Format.Toml`   | `'toml'`   |
| `Format.Ini`    | `'ini'`    |
| `Format.Csv`    | `'csv'`    |
| `Format.Env`    | `'env'`    |

### Path Inference Utilities

Type-safe path inference for compile-time path validation and value resolution:

```typescript
import type {
    DeepPaths,
    ValueAtPath,
} from "@safe-access-inline/safe-access-inline";

type Config = {
    db: { host: string; port: number };
    cache: { ttl: number; enabled: boolean };
};

// All valid dot-notation paths as a union type
type ConfigPaths = DeepPaths<Config>;
// "db" | "db.host" | "db.port" | "cache" | "cache.ttl" | "cache.enabled"

// Resolve value type at a specific path
type Host = ValueAtPath<Config, "db.host">; // string
type Port = ValueAtPath<Config, "db.port">; // number

// Use in function signatures for type safety
function getConfig<P extends DeepPaths<Config>>(
    accessor: AbstractAccessor,
    path: P,
): ValueAtPath<Config, P> {
    return accessor.get(path) as ValueAtPath<Config, P>;
}

const host = getConfig(accessor, "db.host"); // typed as string
```

#### `DeepPaths<T, Depth?>`

Generates a union of all valid dot-notation string paths for type `T`. Recursion depth defaults to 7 levels.

#### `ValueAtPath<T, P>`

Resolves the value type at dot-notation path `P` in type `T`. Returns `unknown` for invalid paths.
