---
outline: deep
---

# API — Types & Internals — JavaScript / TypeScript

## Table of Contents

- [PluginRegistry](#pluginregistry)
- [PathCache](#pathcache)
- [DotNotationParser](#dotnotationparser)
- [Errors](#errors)
- [TypeScript Types](#typescript-types)
- [Enums](#enums)

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

## PathCache

**Import:** `import { PathCache } from '@safe-access-inline/safe-access-inline'`

An internal LRU-style cache for parsed dot-notation paths. Exported for advanced use cases such as pre-warming the cache or clearing it between test runs.

#### `PathCache.get(path: string): unknown | undefined`

Retrieve a cached parse result for the given path string.

#### `PathCache.set(path: string, value: unknown): void`

Store a parse result in the cache.

#### `PathCache.clear(): void`

Evict all entries from the cache.

#### `PathCache.has(path: string): boolean`

Returns `true` if the cache contains an entry for the given path.

#### `PathCache.size: number` _(getter)_

Current number of cached entries.

#### `PathCache.configure(config: Partial<CacheConfig>): void`

Overrides cache configuration (e.g. `maxSize`). Merges with the default config.

```typescript
PathCache.configure({ maxSize: 500 });
```

#### `PathCache.disable(): void`

Disables caching — subsequent `get()` calls always return `undefined`.

#### `PathCache.enable(): void`

Re-enables caching after a previous `disable()` call.

#### `PathCache.isEnabled: boolean` _(getter)_

Whether the cache is currently active.

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

| Error                      | When                                                                                     |
| -------------------------- | ---------------------------------------------------------------------------------------- |
| `AccessorError`            | Base error class                                                                         |
| `InvalidFormatError`       | Invalid input format (e.g., malformed JSON, missing parser plugin)                       |
| `PathNotFoundError`        | Reserved (not thrown by `get()`)                                                         |
| `UnsupportedTypeError`     | No serializer/parser plugin registered for the requested format                          |
| `SecurityError`            | Security constraint violation (payload size, key count, depth, URL safety, XML entities) |
| `ReadonlyViolationError`   | Mutation attempted on a readonly accessor                                                |
| `SchemaValidationError`    | Data fails schema validation via `validate()`                                            |
| `JsonPatchTestFailedError` | JSON Patch `test` operation failed — value at path does not match expected value         |

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

type ReadonlyAccessor = AbstractAccessor;
```

`ReadonlyAccessor` is a convenience alias for `AbstractAccessor` when you want to annotate readonly or immutable accessor flows without repeating the concrete class name.

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

## Additional Types

### `ToJsonOptions`

Optional output controls for `toJson()`. Mirrors PHP's `toJson()` behaviour (unescaped unicode / slashes by default).

```typescript
import type { ToJsonOptions } from "@safe-access-inline/safe-access-inline";

interface ToJsonOptions {
    /**
     * When `true`, replaces `\uXXXX` escape sequences with their actual Unicode characters
     * — equivalent to PHP's `JSON_UNESCAPED_UNICODE`.
     * @defaultValue false
     */
    readonly unescapeUnicode?: boolean;

    /**
     * When `true`, replaces `\/` with `/` in the output
     * — equivalent to PHP's `JSON_UNESCAPED_SLASHES`.
     * @defaultValue false
     */
    readonly unescapeSlashes?: boolean;

    /**
     * Indentation to use when `pretty` is `true`. Accepts a number (spaces) or a string (e.g. `'\t'`).
     * @defaultValue 2
     */
    readonly space?: number | string;
}
```

```typescript
accessor.toJson(true, { unescapeUnicode: true, space: 4 });
// Produces PHP-compatible output: no \uXXXX sequences, 4-space indent
```

### `FilterCondition`

A single condition within a parsed filter expression (e.g. `[?age >= 18]`).

```typescript
import type { FilterCondition } from "@safe-access-inline/safe-access-inline";

interface FilterCondition {
    /** The field path to evaluate (e.g. `"age"`, `"profile.name"`). */
    field: string;
    /** The comparison operator. */
    operator: "==" | "!=" | ">" | "<" | ">=" | "<=";
    /** The value to compare against. */
    value: unknown;
    /** Optional function name (e.g. `"length"`, `"match"`, `"keys"`). */
    func?: string;
    /** Optional function arguments. */
    funcArgs?: string[];
}
```

### `FilterExpression`

A parsed filter expression consisting of one or more `FilterCondition`s joined by logical operators.

```typescript
import type { FilterExpression } from "@safe-access-inline/safe-access-inline";

interface FilterExpression {
    /** Ordered list of comparison conditions. */
    conditions: FilterCondition[];
    /** Logical operators connecting adjacent conditions (`length === conditions.length - 1`). */
    logicals: ("&&" | "||")[];
}
```

```typescript
// The expression `[?age>=18 && active==true]` parses to:
// {
//   conditions: [
//     { field: 'age', operator: '>=', value: 18 },
//     { field: 'active', operator: '==', value: true },
//   ],
//   logicals: ['&&'],
// }
```

### `TraceSegment`

A single step in the result of `AbstractAccessor.trace()`. Each entry corresponds to one parsed segment of the dot-notation path.

```typescript
import type { TraceSegment } from "@safe-access-inline/safe-access-inline";

interface TraceSegment {
    /** String representation of this segment (key name, `[*]`, `[?...]`, etc.). */
    readonly segment: string;
    /** `true` when the segment resolved to a defined value. */
    readonly found: boolean;
    /**
     * JavaScript type of the resolved value, or `null` when `found` is `false`.
     * Possible values: `'object'`, `'array'`, `'string'`, `'number'`, `'boolean'`, `'null'`.
     */
    readonly type:
        | "object"
        | "array"
        | "string"
        | "number"
        | "boolean"
        | "null"
        | null;
}
```

```typescript
const result = accessor.trace("user.profile.name");
// [
//   { segment: 'user', found: true, type: 'object' },
//   { segment: 'profile', found: true, type: 'object' },
//   { segment: 'name', found: true, type: 'string' },
// ]
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

### `AuditEventType`

Identifies the category of an emitted audit event.

| Member                                | Value                    |
| ------------------------------------- | ------------------------ |
| `AuditEventType.FILE_READ`            | `'file.read'`            |
| `AuditEventType.FILE_WATCH`           | `'file.watch'`           |
| `AuditEventType.URL_FETCH`            | `'url.fetch'`            |
| `AuditEventType.SECURITY_VIOLATION`   | `'security.violation'`   |
| `AuditEventType.SECURITY_DEPRECATION` | `'security.deprecation'` |
| `AuditEventType.DATA_MASK`            | `'data.mask'`            |
| `AuditEventType.DATA_FREEZE`          | `'data.freeze'`          |
| `AuditEventType.DATA_FORMAT_WARNING`  | `'data.format_warning'`  |
| `AuditEventType.SCHEMA_VALIDATE`      | `'schema.validate'`      |
| `AuditEventType.PLUGIN_OVERWRITE`     | `'plugin.overwrite'`     |

### `SegmentType`

Discriminator for the parsed segment kinds produced by the dot-notation parser.

| Member                      | Value             |
| --------------------------- | ----------------- |
| `SegmentType.KEY`           | `'key'`           |
| `SegmentType.INDEX`         | `'index'`         |
| `SegmentType.WILDCARD`      | `'wildcard'`      |
| `SegmentType.DESCENT`       | `'descent'`       |
| `SegmentType.DESCENT_MULTI` | `'descent-multi'` |
| `SegmentType.MULTI_INDEX`   | `'multi-index'`   |
| `SegmentType.MULTI_KEY`     | `'multi-key'`     |
| `SegmentType.FILTER`        | `'filter'`        |
| `SegmentType.SLICE`         | `'slice'`         |

### `PatchOperationType`

String enum mirroring the RFC 6902 JSON Patch operation names.

| Member                       | Value       |
| ---------------------------- | ----------- |
| `PatchOperationType.ADD`     | `'add'`     |
| `PatchOperationType.REMOVE`  | `'remove'`  |
| `PatchOperationType.REPLACE` | `'replace'` |
| `PatchOperationType.MOVE`    | `'move'`    |
| `PatchOperationType.COPY`    | `'copy'`    |
| `PatchOperationType.TEST`    | `'test'`    |

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
