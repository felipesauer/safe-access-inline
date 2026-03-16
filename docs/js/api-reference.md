---
outline: deep
---

# API Reference — JavaScript / TypeScript

## Table of Contents

- [SafeAccess Facade](#safeaccess-facade)
- [Accessor Instance Methods](#accessor-instance-methods)
- [Array Operations](#array-operations)
- [JSON Patch](#json-patch)
- [Schema Validation](#schema-validation)
- [Security](#security)
- [I/O & File Loading](#io--file-loading)
- [Audit Logging](#audit-logging)
- [Framework Integrations](#framework-integrations)
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

#### `SafeAccess.fromNdjson(data: string): NdjsonAccessor`

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

#### `toNdjson(): string`

Serializes the data to newline-delimited JSON. Each top-level array item becomes one JSON line.

```typescript
accessor.toNdjson(); // '{"id":1}\n{"id":2}'
```

#### `transform(format: string): string`

Serializes the data to any format that has a registered serializer plugin. Throws `UnsupportedTypeError` if no serializer is found for the given format.

```typescript
accessor.transform("yaml"); // uses registered 'yaml' serializer
accessor.transform("csv"); // uses registered 'csv' serializer
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

---

## Array Operations

All array operations are **immutable** — they return a new accessor instance.

**Import:** These are instance methods on any accessor.

#### `push(path: string, ...items: unknown[]): AbstractAccessor`

Appends items to the array at the given path.

```typescript
const updated = accessor.push("tags", "new-tag");
```

#### `pop(path: string): AbstractAccessor`

Removes the last item from the array at the given path.

#### `shift(path: string): AbstractAccessor`

Removes the first item from the array at the given path.

#### `unshift(path: string, ...items: unknown[]): AbstractAccessor`

Prepends items to the array at the given path.

#### `insert(path: string, index: number, ...items: unknown[]): AbstractAccessor`

Inserts items at the given index in the array at the given path.

```typescript
const updated = accessor.insert("items", 2, { id: 99 });
```

#### `filterAt(path: string, predicate: (item, index) => boolean): AbstractAccessor`

Filters the array at the given path using a predicate function.

```typescript
const active = accessor.filterAt("users", (u) => u.active === true);
```

#### `mapAt(path: string, transform: (item, index) => unknown): AbstractAccessor`

Transforms each item in the array at the given path.

#### `sortAt(path: string, key?: string, direction?: 'asc' | 'desc'): AbstractAccessor`

Sorts the array at the given path. For arrays of objects, pass `key` to sort by a specific field.

```typescript
const sorted = accessor.sortAt("items", "price", "desc");
```

#### `unique(path: string, key?: string): AbstractAccessor`

Removes duplicates from the array at the given path. For objects, pass `key` to deduplicate by a specific field.

#### `flatten(path: string, depth?: number): AbstractAccessor`

Flattens nested arrays at the given path. Default depth is 1.

#### `first(path: string, defaultValue?: unknown): unknown`

Returns the first element of the array at the given path.

```typescript
accessor.first("items"); // first item
accessor.first("items", null); // null if empty
```

#### `last(path: string, defaultValue?: unknown): unknown`

Returns the last element of the array at the given path.

#### `nth(path: string, index: number, defaultValue?: unknown): unknown`

Returns the element at the given index. Supports negative indices.

```typescript
accessor.nth("items", -1); // last item
```

---

## JSON Patch

**Import:** `import { diff, applyPatch } from '@safe-access-inline/safe-access-inline'`

#### `diff(a: Record<string, unknown>, b: Record<string, unknown>): JsonPatchOp[]`

Computes a RFC 6902 JSON Patch between two objects.

```typescript
const patches = diff(original, modified);
// [{ op: 'replace', path: '/name', value: 'New' }, ...]
```

#### `applyPatch(data: Record<string, unknown>, ops: JsonPatchOp[]): Record<string, unknown>`

Applies a JSON Patch to an object. Returns a new object (does not mutate input).

```typescript
const result = applyPatch(data, patches);
```

#### Instance Methods

Accessors also expose these as instance methods:

```typescript
const patches = accessorA.diff(accessorB);
const patched = accessor.applyPatch(patches);
```

#### `JsonPatchOp`

```typescript
type JsonPatchOp = {
    op: "add" | "remove" | "replace" | "move" | "copy" | "test";
    path: string;
    value?: unknown;
    from?: string;
};
```

---

## Schema Validation

**Import:** `import { SchemaRegistry, SchemaValidationError } from '@safe-access-inline/safe-access-inline'`

#### `SchemaRegistry.setDefaultAdapter(adapter: SchemaAdapterInterface): void`

Sets a global default schema adapter used by `accessor.validate()` when no adapter is passed.

#### `SchemaRegistry.getDefaultAdapter(): SchemaAdapterInterface | null`

Returns the current default adapter, or `null`.

#### `SchemaRegistry.clearDefaultAdapter(): void`

Clears the default adapter.

#### `SchemaAdapterInterface`

```typescript
interface SchemaAdapterInterface<TSchema = unknown> {
    validate(
        data: Record<string, unknown>,
        schema: TSchema,
    ): SchemaValidationResult;
}

interface SchemaValidationResult {
    valid: boolean;
    issues: SchemaValidationIssue[];
}

interface SchemaValidationIssue {
    path: string;
    message: string;
}
```

---

## Security

### SecurityPolicy

**Import:** `import { mergePolicy, defaultPolicy } from '@safe-access-inline/safe-access-inline'`

A unified security configuration that aggregates all security options.

```typescript
import type { SecurityPolicy } from "@safe-access-inline/safe-access-inline";

const policy = mergePolicy(defaultPolicy(), {
    maxDepth: 256,
    allowedDirs: ["/etc/config"],
    url: { allowPrivateIps: false, allowedHosts: ["api.example.com"] },
    maskPatterns: ["password", "secret"],
});

const accessor = SafeAccess.withPolicy(data, policy);
const fileAccessor = await SafeAccess.fromFileWithPolicy(
    "/etc/config/app.json",
    policy,
);
const urlAccessor = await SafeAccess.fromUrlWithPolicy(
    "https://api.example.com/config",
    policy,
);
```

#### `SecurityPolicy` interface

```typescript
interface SecurityPolicy {
    maxDepth?: number;
    maxPayloadBytes?: number;
    maxKeys?: number;
    allowedDirs?: string[];
    url?: UrlPolicy;
    csvMode?: "none" | "prefix" | "strip" | "error";
    maskPatterns?: MaskPattern[];
}

interface UrlPolicy {
    allowPrivateIps?: boolean;
    allowedHosts?: string[];
    allowedPorts?: number[];
}
```

#### `mergePolicy(base, overrides?): SecurityPolicy`

Merges two policies. Overrides take precedence.

#### `defaultPolicy(): SecurityPolicy`

Returns the default policy (maxDepth=512, maxPayloadBytes=10MB, maxKeys=10000).

### SecurityOptions

**Import:** `import { assertPayloadSize, assertMaxKeys, assertMaxDepth } from '@safe-access-inline/safe-access-inline'`

Low-level assertion functions used internally by all format parsers:

- `assertPayloadSize(input: string, maxBytes?: number): void`
- `assertMaxKeys(data: Record<string, unknown>, maxKeys?: number): void`
- `assertMaxDepth(currentDepth: number, maxDepth?: number): void`

### Data Masking

**Import:** `import { mask } from '@safe-access-inline/safe-access-inline'`

#### `mask(data, patterns?): Record<string, unknown>`

Recursively masks sensitive values. Auto-detects common sensitive keys (password, secret, token, etc.). Supports wildcard patterns with `*`.

```typescript
const safe = mask(data, ["api_*", "credentials"]);
// { password: '[REDACTED]', api_key: '[REDACTED]', name: 'Ana' }
```

### CSV Sanitization

**Import:** `import { sanitizeCsvCell, sanitizeCsvRow } from '@safe-access-inline/safe-access-inline'`

Protects against CSV formula injection.

- `sanitizeCsvCell(cell: string, mode?: CsvSanitizeMode): string`
- `sanitizeCsvRow(row: string[], mode?: CsvSanitizeMode): string[]`

Modes: `'prefix'` (prefix with `'`), `'strip'` (removes all CSV injection prefix characters: `=`, `+`, `-`, `@`, `\t`, `\r`, `\n` per OWASP CSV Injection guidance), `'error'` (throw), `'none'` (passthrough).

### Deep Freeze

**Import:** `import { deepFreeze } from '@safe-access-inline/safe-access-inline'`

#### `deepFreeze<T extends object>(obj: T): Readonly<T>`

Recursively freezes an object. Useful for making config immutable at runtime.

### IP Range Checker

**Import:** `import { assertSafeUrl, isPrivateIp } from '@safe-access-inline/safe-access-inline'`

- `assertSafeUrl(url: string, options?): void` — Throws `SecurityError` if the URL targets a private IP (SSRF protection).
- `isPrivateIp(ip: string): boolean` — Returns `true` for private/loopback IPs.

---

## I/O & File Loading

### File Loading

```typescript
// Synchronous
const accessor = SafeAccess.fromFileSync("./config.json");
const accessor = SafeAccess.fromFileSync("./config.yaml", {
    format: "yaml",
    allowedDirs: ["/etc/config"],
});

// Async
const accessor = await SafeAccess.fromFile("./config.json");
```

### URL Loading

```typescript
const accessor = await SafeAccess.fromUrl(
    "https://api.example.com/config.json",
    {
        allowPrivateIps: false,
        allowedHosts: ["api.example.com"],
        allowedPorts: [443],
    },
);
```

### Layered Config

Merge multiple config sources (last wins):

```typescript
const config = SafeAccess.layer([defaults, overrides, local]);
const config = await SafeAccess.layerFiles([
    "./defaults.yaml",
    "./overrides.json",
]);
```

### File Watcher

```typescript
const stop = SafeAccess.watchFile("./config.yaml", (accessor) => {
    console.log("Config changed:", accessor.get("app.name"));
});

// Later: stop watching
stop();
```

---

## Audit Logging

**Import:** `import { onAudit, clearAuditListeners } from '@safe-access-inline/safe-access-inline'`

Subscribe to security and data operation events.

```typescript
const unsubscribe = SafeAccess.onAudit((event) => {
    console.log(`[${event.type}]`, event.detail);
});

// Event types: 'file.read', 'url.fetch', 'security.violation', 'data.mask',
//              'file.watch', 'data.freeze', 'schema.validate'

// Cleanup
SafeAccess.clearAuditListeners();
unsubscribe(); // or unsubscribe individually
```

#### `AuditEvent`

```typescript
interface AuditEvent {
    type: AuditEventType;
    timestamp: number;
    detail: Record<string, unknown>;
}

type AuditEventType =
    | "file.read"
    | "file.watch"
    | "url.fetch"
    | "security.violation"
    | "data.mask"
    | "data.freeze"
    | "schema.validate";
```

---

## Framework Integrations

### NestJS

**Import:** `import { SafeAccessModule, SAFE_ACCESS, createSafeAccessProvider } from '@safe-access-inline/safe-access-inline'`

```typescript
// Option 1: Module registration
@Module({
    imports: [
        SafeAccessModule.register({
            filePath: "./config.yaml",
        }),
    ],
})
export class AppModule {}

// Option 2: Custom provider
@Module({
    providers: [
        createSafeAccessProvider({
            layerPaths: ["./defaults.yaml", "./overrides.json"],
        }),
    ],
    exports: [SAFE_ACCESS],
})
export class ConfigModule {}

// Inject in services
@Injectable()
class MyService {
    constructor(@Inject(SAFE_ACCESS) private config: AbstractAccessor) {}
}
```

### Vite Plugin

**Import:** `import { safeAccessPlugin, loadConfig } from '@safe-access-inline/safe-access-inline'`

```typescript
// vite.config.ts
import { safeAccessPlugin } from "@safe-access-inline/safe-access-inline";

export default defineConfig({
    plugins: [
        safeAccessPlugin({
            files: ["./config/defaults.yaml", "./config/local.json"],
            virtualId: "virtual:safe-access-config", // default
        }),
    ],
});

// In app code:
import config from "virtual:safe-access-config";
// config is the merged JSON object
```

HMR is supported — changing a watched config file triggers a full reload.

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

| Error                    | When                                                                                             |
| ------------------------ | ------------------------------------------------------------------------------------------------ |
| `AccessorError`          | Base error class                                                                                 |
| `InvalidFormatError`     | Invalid input format (e.g., malformed JSON, missing parser plugin)                               |
| `PathNotFoundError`      | Reserved (not thrown by `get()`)                                                                 |
| `UnsupportedTypeError`   | No serializer/parser plugin registered for the requested format (e.g., `toXml()` without plugin) |
| `SecurityError`          | Security constraint violation (payload size, key count, depth, URL safety, XML entities)         |
| `ReadonlyViolationError` | Mutation attempted on a readonly accessor                                                        |
| `SchemaValidationError`  | Data fails schema validation via `validate()`                                                    |

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
| `Format.Ndjson` | `'ndjson'` |

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
