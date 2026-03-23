---
outline: deep
---

# API Reference — JavaScript / TypeScript

## Table of Contents

- [SafeAccess Facade](#safeaccess-facade)
- [Accessor Instance Methods](#accessor-instance-methods)
- [Performance: Compiled Paths](#performance-compiled-paths)
- [Array Operations (Immutable)](#array-operations-immutable)
- [Security & Validation](#security-validation)
- [Readonly](#readonly)
- [JSON Patch (RFC 6902)](#json-patch-rfc-6902)
- [Dependency Injection](#dependency-injection)

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

#### `SafeAccess.fromCsv(data: string, options?: { readonly?: boolean }): CsvAccessor`

Creates an accessor from a CSV string (first line = headers).

```typescript
const accessor = SafeAccess.fromCsv("name,age\nAna,30");
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

Detection priority: array → object → JSON string (with NDJSON fallback) → XML string → YAML string → TOML string → INI string → ENV string.

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

## Performance: Compiled Paths

Pre-compile dot-notation paths that are accessed repeatedly to skip re-parsing on every call.

#### `SafeAccess.compilePath(path: string): CompiledPath`

Parses a dot-notation path once and returns an opaque `CompiledPath` object. Pass it to `getCompiled()` to resolve values without re-tokenizing the path string on each call. Best suited for tight loops or hot paths that access the same field across many accessors.

**Parameters:**

- `path` — dot-notation path to compile (e.g., `"user.address.city"`).

**Returns:** A `CompiledPath` instance (opaque handle — do not access internal fields directly).

```typescript
import { SafeAccess } from "@safe-access-inline/safe-access-inline";

// Compile once
const compiledPath = SafeAccess.compilePath("user.address.city");

// Reuse across many accessors — no re-parsing
const a = SafeAccess.fromObject({ user: { address: { city: "São Paulo" } } });
const b = SafeAccess.fromObject({ user: { address: { city: "Lisbon" } } });

a.getCompiled(compiledPath); // "São Paulo"
b.getCompiled(compiledPath); // "Lisbon"
```

#### `getCompiled(compiled: CompiledPath, defaultValue?: unknown): unknown`

Resolves the pre-compiled path against this accessor's data. Returns `defaultValue` (or `null`) when the path does not exist.

**Parameters:**

- `compiled` — a `CompiledPath` created by `SafeAccess.compilePath()`.
- `defaultValue` _(optional)_ — value to return when the path is missing.

```typescript
const compiled = SafeAccess.compilePath("app.timeout");
const accessor = SafeAccess.fromObject({ app: { timeout: 30 } });

accessor.getCompiled(compiled); // 30
accessor.getCompiled(compiled, 60); // 30 (path exists)

const empty = SafeAccess.fromObject({});
empty.getCompiled(compiled); // null
empty.getCompiled(compiled, 60); // 60
```

::: tip Performance tip
`compilePath()` combined with `getCompiled()` performs better than `get()` in tight loops where the same path is used hundreds or thousands of times. For typical one-off access, prefer the simpler `get()` API.
:::

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

#### `getCompiled(compiled: CompiledPath, defaultValue?: unknown): unknown`

Resolves a pre-compiled path (see [`SafeAccess.compilePath()`](#safeaccess-compilepath-path-string-compiledpath)) against this accessor's data. Prefer this over `get()` in hot loops where the same path is read repeatedly across many accessors.

```typescript
const compiled = SafeAccess.compilePath("user.name");
accessor.getCompiled(compiled); // 'Ana'
accessor.getCompiled(compiled, "N/A"); // 'Ana' if exists, 'N/A' if missing
```

#### `hasAt(segments: string[]): boolean`

Check if a path exists using an array of segments.

#### `type(path: string): string | null`

Returns the normalized type of the value at the given path, or `null` if path doesn't exist.

Possible values: `"string"`, `"number"`, `"bool"`, `"object"`, `"array"`, `"null"`, `"undefined"`. Returns `null` (not a string) when the path does not exist.

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

#### `toCsv(csvMode?: 'none' | 'prefix' | 'strip' | 'error'): string`

Serializes the data to CSV format. The optional `csvMode` parameter controls CSV injection sanitization.

```typescript
accessor.toCsv(); // default: no sanitization
accessor.toCsv("strip"); // strip dangerous leading characters
```

#### `transform(format: string): string`

Serializes the data to any format that has a registered serializer plugin. Throws `UnsupportedTypeError` if no serializer is found for the given format.

```typescript
accessor.transform("yaml"); // uses registered 'yaml' serializer
accessor.transform("csv"); // uses registered 'csv' serializer
```

### Array Operations (Immutable)

All array operations return **new instances** — the original is never mutated.

#### `push(path: string, ...items: unknown[]): AbstractAccessor`

Appends items to the end of the array at `path`.

```typescript
const updated = accessor.push("tags", "typescript", "safe");
```

#### `pop(path: string): AbstractAccessor`

Removes the last item from the array at `path`.

```typescript
const updated = accessor.pop("tags");
```

#### `shift(path: string): AbstractAccessor`

Removes the first item from the array at `path`.

```typescript
const updated = accessor.shift("queue");
```

#### `unshift(path: string, ...items: unknown[]): AbstractAccessor`

Prepends items to the beginning of the array at `path`.

```typescript
const updated = accessor.unshift("queue", "first");
```

#### `insert(path: string, index: number, ...items: unknown[]): AbstractAccessor`

Inserts items at a specific index in the array at `path`. Supports negative indices.

```typescript
const updated = accessor.insert("items", 1, "inserted");
const updated2 = accessor.insert("items", -1, "before-last");
```

#### `filterAt(path: string, predicate: (item: unknown, index: number) => boolean): AbstractAccessor`

Filters array items at `path` using a predicate.

```typescript
const updated = accessor.filterAt("users", (u) => (u as any).active === true);
```

#### `mapAt(path: string, transform: (item: unknown, index: number) => unknown): AbstractAccessor`

Transforms each array item at `path` using `transform`.

```typescript
const updated = accessor.mapAt("prices", (p) => (p as number) * 1.1);
```

#### `sortAt(path: string, key?: string, direction?: 'asc' | 'desc'): AbstractAccessor`

Sorts the array at `path`. Optionally by a sub-key. Direction: `'asc'` (default) or `'desc'`.

```typescript
const sorted = accessor.sortAt("users", "name");
const desc = accessor.sortAt("scores", undefined, "desc");
```

#### `unique(path: string, key?: string): AbstractAccessor`

Removes duplicate values from the array at `path`. Optionally de-duplicates by a sub-key.

```typescript
const updated = accessor.unique("tags");
const updated2 = accessor.unique("users", "email");
```

#### `flatten(path: string, depth?: number): AbstractAccessor`

Flattens nested arrays at `path` by `depth` levels (default `1`).

```typescript
const updated = accessor.flatten("matrix"); // 1 level
const updated2 = accessor.flatten("deep", Infinity); // fully flat
```

#### `first(path: string, defaultValue?: unknown): unknown`

Returns the first element of the array at `path`.

```typescript
accessor.first("items"); // first item or null
accessor.first("items", "none"); // first item or "none"
```

#### `last(path: string, defaultValue?: unknown): unknown`

Returns the last element of the array at `path`.

```typescript
accessor.last("items"); // last item or null
```

#### `nth(path: string, index: number, defaultValue?: unknown): unknown`

Returns the element at `index`. Supports negative indices (`-1` = last).

```typescript
accessor.nth("items", 0); // first
accessor.nth("items", -1); // last
accessor.nth("items", 99, "fallback"); // "fallback"
```

### Security & Validation

#### `masked(patterns?: MaskPattern[]): AbstractAccessor`

Returns a **new instance** with sensitive values redacted. Without patterns, auto-detects common sensitive keys (password, secret, token, api_key, etc.). With patterns, additionally masks keys matching the wildcard patterns.

```typescript
const safe = accessor.masked(); // auto-mask common keys
const custom = accessor.masked(["api_*", "credentials"]); // custom patterns
```

#### `validate<TSchema>(schema: TSchema, adapter?: SchemaAdapterInterface): this`

Validates the data against a schema using the given adapter (or the default adapter set via `SchemaRegistry`). Returns `this` if valid; throws `SchemaValidationError` if invalid.

```typescript
import { SchemaRegistry } from "@safe-access-inline/safe-access-inline";

// Register a default schema adapter (e.g., Zod)
SchemaRegistry.setDefaultAdapter(myZodAdapter);

// Validate inline
accessor.validate(mySchema);
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

### JSON Patch (RFC 6902)

Instance methods for computing and applying RFC 6902 JSON Patch operations. Free functions are also exported for standalone use — see [API — Operations & I/O](/js/api-features#json-patch).

#### `diff(other: AbstractAccessor): JsonPatchOperation[]`

Computes an RFC 6902 JSON Patch between this accessor and `other`.

```typescript
const patches = accessorA.diff(accessorB);
// [{ op: 'replace', path: '/name', value: 'New' }, ...]
```

#### `applyPatch(ops: JsonPatchOperation[]): AbstractAccessor`

Applies RFC 6902 JSON Patch operations. Returns a **new instance** — does not mutate.

```typescript
const updated = accessor.applyPatch([
    { op: "replace", path: "/name", value: "Updated" },
    { op: "add", path: "/newKey", value: 42 },
    { op: "remove", path: "/oldKey" },
]);
```

#### `validatePatch(ops: JsonPatchOperation[]): void`

Validates a list of RFC 6902 JSON Patch operations. Throws `JsonPatchValidationError` if any operation is structurally invalid.

```typescript
accessor.validatePatch([{ op: "replace", path: "/name", value: "OK" }]); // passes
accessor.validatePatch([{ op: "invalid" as any, path: "/" }]); // throws
```

#### `JsonPatchOperation`

```typescript
type JsonPatchOperation = {
    op: "add" | "remove" | "replace" | "move" | "copy" | "test";
    path: string;
    value?: unknown;
    from?: string;
};
```

---

## Dependency Injection

**Import:** `import { ServiceContainer, defaultContainer } from '@safe-access-inline/safe-access-inline'`

The library ships a lightweight service container that bundles the two core registries (`PluginRegistry` and `SchemaRegistry`). Dependency injection was introduced so tests can operate on fully isolated registry instances without calling global `resetAll()` methods and without interfering with other tests running in parallel.

### `ServiceContainer`

A lightweight container that holds a `pluginRegistry` and a `schemaRegistry`.

#### Fields

| Field            | Type              | Description                                  |
| ---------------- | ----------------- | -------------------------------------------- |
| `pluginRegistry` | `IPluginRegistry` | Plugin registry instance for this container. |
| `schemaRegistry` | `ISchemaRegistry` | Schema registry instance for this container. |

#### `ServiceContainer.create(): ServiceContainer`

Creates a new container with **fresh, isolated** registry instances. No state is shared with the global defaults or with other containers created via this method.

```typescript
import { ServiceContainer } from "@safe-access-inline/safe-access-inline";

const container = ServiceContainer.create();
// container.pluginRegistry and container.schemaRegistry are brand-new instances
// — completely independent from the global defaults
```

#### Constructor

```typescript
new ServiceContainer(opts?: {
    pluginRegistry?: IPluginRegistry;
    schemaRegistry?: ISchemaRegistry;
})
```

When `opts` is omitted, the global default singletons are used. Prefer `ServiceContainer.create()` for isolated instances.

### `defaultContainer`

The process-wide default container. Wraps `PluginRegistry.getDefault()` and `SchemaRegistry.getDefault()` — the same singletons used implicitly by all static helper methods throughout the library.

```typescript
import { defaultContainer } from "@safe-access-inline/safe-access-inline";

// Inspect the globally registered plugins
defaultContainer.pluginRegistry.has("yaml", "parser"); // true if a YAML parser is registered
```

### When to use each

| Scenario                                | Recommended                                            |
| --------------------------------------- | ------------------------------------------------------ |
| Production application code             | `defaultContainer` (implicit via static API)           |
| Test isolation (no `resetAll()` needed) | `ServiceContainer.create()`                            |
| Custom plugin scope for a feature       | `ServiceContainer.create()` with explicit registration |

### Examples

**Isolated container for testing:**

```typescript
import { ServiceContainer } from "@safe-access-inline/safe-access-inline";
import type {
    IPluginRegistry,
    ISchemaRegistry,
} from "@safe-access-inline/safe-access-inline";

describe("MyFeature", () => {
    let container: ServiceContainer;

    beforeEach(() => {
        // Fresh registries per test — no global state shared
        container = ServiceContainer.create();
    });

    it("registers a custom parser without affecting other tests", () => {
        container.pluginRegistry.registerParser("toml", myTomlParser);
        expect(container.pluginRegistry.has("toml", "parser")).toBe(true);
        // Global PluginRegistry is NOT affected
    });
});
```

**Injecting custom registries:**

```typescript
import {
    ServiceContainer,
    PluginRegistry,
    SchemaRegistry,
} from "@safe-access-inline/safe-access-inline";

const myRegistry = PluginRegistry.create();
myRegistry.registerParser("csv", myCsvParser);

const container = new ServiceContainer({ pluginRegistry: myRegistry });
// container.schemaRegistry falls back to SchemaRegistry.getDefault()
```

See also: [Architecture — Plugin System](/guide/architecture#plugin-system)

```

```
