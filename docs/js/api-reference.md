---
outline: deep
---

# API Reference — JavaScript / TypeScript

## Table of Contents

- [SafeAccess Facade](#safeaccess-facade)
- [Accessor Instance Methods](#accessor-instance-methods)
- [Performance: Compiled Paths](#performance-compiled-paths)
- [Readonly](#readonly)
- [I/O Types](#io-types)
- [Security Utility Functions](#security-utility-functions)

See also: [API — Operations & I/O](/js/api-features) · [API — Types & Internals](/js/api-types)

---

## SafeAccess Facade

**Import:** `import { SafeAccess } from '@safe-access-inline/safe-access-inline'`

### Factory Methods

#### `SafeAccess.fromArray(data: unknown[], options?: { readonly?: boolean }): ArrayAccessor`

Creates an accessor from an array. Pass `{ readonly: true }` to prevent mutations.

```typescript
const accessor = SafeAccess.fromArray([{ name: "Ana" }, { name: "Bob" }]);
const ro = SafeAccess.fromArray([1, 2, 3], { readonly: true });
```

#### `SafeAccess.fromObject(data: Record<string, unknown>, options?: { readonly?: boolean }): ObjectAccessor`

Creates an accessor from a plain object. Pass `{ readonly: true }` to prevent mutations.

```typescript
const accessor = SafeAccess.fromObject({ name: "Ana", age: 30 });
const ro = SafeAccess.fromObject({ key: "value" }, { readonly: true });
```

#### `SafeAccess.fromJson(data: string, options?: { readonly?: boolean }): JsonAccessor`

Creates an accessor from a JSON string.

```typescript
const accessor = SafeAccess.fromJson('{"name": "Ana"}');
```

#### `SafeAccess.fromXml(data: string, options?: { readonly?: boolean }): XmlAccessor`

Creates an accessor from an XML string.

```typescript
const accessor = SafeAccess.fromXml("<root><name>Ana</name></root>");
```

#### `SafeAccess.fromYaml(data: string, options?: { readonly?: boolean }): YamlAccessor`

Creates an accessor from a YAML string. Uses `js-yaml` by default. If a parser plugin is registered via `PluginRegistry`, the plugin takes precedence.

```typescript
const accessor = SafeAccess.fromYaml("name: Ana\nage: 30");
```

#### `SafeAccess.fromToml(data: string, options?: { readonly?: boolean }): TomlAccessor`

Creates an accessor from a TOML string. Uses `smol-toml` by default. If a parser plugin is registered via `PluginRegistry`, the plugin takes precedence.

```typescript
const accessor = SafeAccess.fromToml('name = "Ana"');
```

#### `SafeAccess.fromIni(data: string, options?: { readonly?: boolean }): IniAccessor`

Creates an accessor from an INI string.

```typescript
const accessor = SafeAccess.fromIni("[section]\nkey = value");
```

#### `SafeAccess.fromEnv(data: string, options?: { readonly?: boolean }): EnvAccessor`

Creates an accessor from a `.env` format string.

```typescript
const accessor = SafeAccess.fromEnv("APP_NAME=MyApp\nDEBUG=true");
```

#### `SafeAccess.fromNdjson(data: string, options?: { readonly?: boolean }): NdjsonAccessor`

Creates an accessor from a newline-delimited JSON (NDJSON) string.

```typescript
const accessor = SafeAccess.fromNdjson('{"id":1}\n{"id":2}');
```

#### `SafeAccess.from(data: unknown, format?: string | Format): AbstractAccessor`

Unified factory — creates an accessor from any data. With a format string or `Format` enum value, delegates to the corresponding typed factory. Without a format, auto-detects (same as `detect()`).

Supported formats: `'array'`, `'object'`, `'json'`, `'xml'`, `'yaml'`, `'toml'`, `'ini'`, `'env'`, `'ndjson'`. All built-in formats are also available as `Format` enum members.

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
```

Throws `InvalidFormatError` if the format is unknown.

#### `SafeAccess.detect(data: unknown): AbstractAccessor`

Auto-detects the format and creates the appropriate accessor.

Detection priority: array → object → JSON string (with NDJSON fallback) → XML string → YAML string → TOML string → INI string → ENV string.

```typescript
const accessor = SafeAccess.detect({ key: "value" }); // ObjectAccessor
const fromJson = SafeAccess.detect('{"name": "Ana"}'); // JsonAccessor
const fromXml = SafeAccess.detect("<root><name>Ana</name></root>"); // XmlAccessor
const fromYaml = SafeAccess.detect("name: Ana\nage: 30"); // YamlAccessor
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

#### `getWildcard<T = unknown>(path: string, defaultValue?: T[]): T[]`

Convenience wrapper for wildcard paths — always returns a typed array. Equivalent to calling `get()` with a path containing a `*` or `.**` expression, but with explicit typed-array return guarantees.

```typescript
accessor.getWildcard("users.*.name"); // ['Alice', 'Bob', 'Charlie']
accessor.getWildcard("items.*.price", []); // [] if path not found
accessor.getWildcard<number>("prices.*", [0]); // [1.99, 2.49, 3.00]
```

#### `has(path: string): boolean`

Check if a path exists in the data.

```typescript
accessor.has("user.name"); // true
accessor.has("missing"); // false
```

#### `getTemplate(template: string, bindings: Record<string, string | number>, defaultValue?: unknown): unknown`

Resolves a template string by substituting `{key}` placeholders with binding values, then reads the resulting path.

```typescript
accessor.getTemplate("users.{id}.name", { id: 0 }); // 'Ana'
accessor.getTemplate(
    "settings.{section}.{key}",
    { section: "db", key: "host" },
    "localhost",
);
```

#### `getAt(segments: string[], defaultValue?: unknown): unknown`

Access a value via an array of path segments (programmatic alternative to dot-notation strings).

```typescript
accessor.getAt(["users", "0", "name"]); // 'Ana'
```

#### `hasAt(segments: string[]): boolean`

Check if a path exists using an array of segments.

#### `type(path: string): string | null`

Returns the normalized type of the value at the given path, or `null` if path doesn't exist.

Possible values: `"string"`, `"number"`, `"bool"`, `"object"`, `"array"`, `"null"`. Returns `null` (not a string) when the path does not exist.

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

#### `setAt(segments: string[], value: unknown): AbstractAccessor`

Sets a value using an array of path segments. Returns a **new instance**.

```typescript
const newAccessor = accessor.setAt(["user", "email"], "ana@example.com");
```

#### `removeAt(segments: string[]): AbstractAccessor`

Removes a path using an array of segments. Returns a **new instance**.

### Transformation

#### `toArray(): Record<string, unknown>`

Returns a shallow copy of the data. Semantic intent: "convert to array/object format". Currently identical to `all()`, but semantically distinct for future extensibility.

#### `toJson(pretty?: boolean, options?: ToJsonOptions): string`

Convert to JSON string.

```typescript
accessor.toJson(); // compact
accessor.toJson(true); // pretty-printed with 2-space indent

// PHP-compatible output: unescaped unicode + slashes, 4-space indent
import type { ToJsonOptions } from "@safe-access-inline/safe-access-inline";

const opts: ToJsonOptions = {
    unescapeUnicode: true, // \u00e9 → é
    unescapeSlashes: true, // \/ → /
    space: 4,
};
accessor.toJson(true, opts);
```

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

Serializes the data to XML. Uses a built-in XML serializer by default — produces `<?xml version="1.0"?><root>...</root>`. If an `'xml'` serializer plugin is registered via `PluginRegistry`, the plugin takes precedence. The `rootElement` parameter (default: `'root'`) sets the XML root element name.

```typescript
// Built-in serializer (no plugin needed)
accessor.toXml(); // <?xml version="1.0"?>\n<root>...</root>
accessor.toXml("config"); // <?xml version="1.0"?>\n<config>...</config>

// Register a plugin to override the built-in with a custom implementation
PluginRegistry.registerSerializer("xml", {
    serialize: (data) => myXmlLib.build(data),
});
accessor.toXml(); // uses your plugin
```

#### `toNdjson(): string`

Serializes the data to newline-delimited JSON. Each top-level array item becomes one JSON line.

```typescript
accessor.toNdjson(); // '{"id":1}\n{"id":2}'
```

### Readonly

All factory methods (`fromJson`, `fromArray`, etc.) accept `{ readonly: true }` to create an accessor that throws `ReadonlyViolationError` on any mutation. You can also freeze an existing instance at runtime.

#### `freeze(): AbstractAccessor`

Returns a frozen copy of this accessor. All subsequent write operations will throw a `ReadonlyViolationError`.

```typescript
const frozen = accessor.freeze();
frozen.set("key", "value"); // throws ReadonlyViolationError

// Via factory options
const ro = SafeAccess.fromJson('{"key":"value"}', { readonly: true });
ro.set("key", "new"); // throws ReadonlyViolationError
```

---

## Global State Reset

#### `SafeAccess.resetAll(): void`

Resets **all** global static state at once: the default plugin registry, the path cache, and any globally configured security policy.

```typescript
import { SafeAccess } from "@safe-access-inline/safe-access-inline";

afterEach(() => {
    SafeAccess.resetAll();
});
```

**When to use:** In test suite teardown, when multiple subsystems were configured globally and a completely clean slate is needed between test cases.
