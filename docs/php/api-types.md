---
outline: deep
---

# API — Types & Internals — PHP

## Table of Contents

- [PluginRegistry](#pluginregistry)
- [PathCache](#pathcache)
- [DotNotationParser](#dotnotationparser)
- [Exceptions](#exceptions)
- [Interfaces](#interfaces)
- [Enums](#enums)

## PluginRegistry

**Namespace:** `SafeAccessInline\Core\Registries\PluginRegistry`

Static registry for parser and serializer plugins. Parsers convert raw strings to arrays; serializers convert arrays to formatted strings.

#### `PluginRegistry::registerParser(string $format, ParserPluginInterface $parser): void`

Register a parser plugin for the given format.

```php
use SafeAccessInline\Plugins\SymfonyYamlParser;
PluginRegistry::registerParser('yaml', new SymfonyYamlParser());
```

#### `PluginRegistry::registerSerializer(string $format, SerializerPluginInterface $serializer): void`

Register a serializer plugin for the given format.

```php
use SafeAccessInline\Plugins\SymfonyYamlSerializer;
PluginRegistry::registerSerializer('yaml', new SymfonyYamlSerializer());
```

#### `PluginRegistry::hasParser(string $format): bool`

Check if a parser is registered for the given format.

#### `PluginRegistry::hasSerializer(string $format): bool`

Check if a serializer is registered for the given format.

#### `PluginRegistry::getParser(string $format): ParserPluginInterface`

Get the registered parser. Throws `UnsupportedTypeException` if not registered.

#### `PluginRegistry::getSerializer(string $format): SerializerPluginInterface`

Get the registered serializer. Throws `UnsupportedTypeException` if not registered.

#### `PluginRegistry::reset(): void`

Clear all registered plugins. Intended for testing — call in `beforeEach` to prevent cross-test pollution.

### Plugin Interfaces

#### `ParserPluginInterface`

**Namespace:** `SafeAccessInline\Contracts\ParserPluginInterface`

```php
interface ParserPluginInterface
{
    /**
     * @param string $raw
     * @return array<mixed>
     * @throws InvalidFormatException
     */
    public function parse(string $raw): array;
}
```

#### `SerializerPluginInterface`

**Namespace:** `SafeAccessInline\Contracts\SerializerPluginInterface`

```php
interface SerializerPluginInterface
{
    /**
     * @param array<mixed> $data
     * @return string
     */
    public function serialize(array $data): string;
}
```

---

## PathCache

**Namespace:** `SafeAccessInline\Core\PathCache`

An internal LRU-style cache for parsed dot-notation path segments. Exported for advanced use cases such as pre-warming the cache or clearing it between test runs. All methods are static.

#### `PathCache::get(string $path): ?array`

Retrieve cached parsed segments for the given path string.

#### `PathCache::set(string $path, array $segments): void`

Store parsed segments in the cache.

#### `PathCache::has(string $path): bool`

Check if a path is cached.

#### `PathCache::clear(): void`

Evict all entries from the cache.

#### `PathCache::size(): int`

Return the current number of cached entries.

#### `PathCache::enable(): void`

Enable the cache (enabled by default).

#### `PathCache::disable(): void`

Disable the cache — all lookups will bypass the cache.

#### `PathCache::isEnabled(): bool`

Check if the cache is currently enabled.

---

## DotNotationParser

**Namespace:** `SafeAccessInline\Core\Parsers\DotNotationParser`

Static utility class. Typically used internally, but available for direct use.

#### `DotNotationParser::get(array $data, string $path, mixed $default = null): mixed`

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

```php
// Filter: all admin users
DotNotationParser::get($data, "users[?role=='admin']");

// Filter with numeric comparison + path continuation
DotNotationParser::get($data, 'products[?price>20].name');

// Combined AND
DotNotationParser::get($data, "items[?type=='fruit' && color=='red'].name");

// Recursive descent: all "name" values at any depth
DotNotationParser::get($data, '..name');

// Descent + wildcard
DotNotationParser::get($data, '..items.*.id');

// Descent + filter
DotNotationParser::get($data, "..employees[?active==true].name");
```

#### `DotNotationParser::has(array $data, string $path): bool`

#### `DotNotationParser::set(array $data, string $path, mixed $value): array`

Returns a new array (does not mutate input).

#### `DotNotationParser::merge(array $data, string $path, array $value): array`

Deep merges `$value` at `$path`. When `$path` is empty, merges at root. Associative arrays are merged recursively; other values are replaced.

```php
$result = DotNotationParser::merge($data, 'user.settings', ['theme' => 'dark']);
```

#### `DotNotationParser::remove(array $data, string $path): array`

Returns a new array (does not mutate input).

#### `DotNotationParser::renderTemplate(string $template, array $bindings): string`

Renders `{key}` placeholders in a path template.

```php
DotNotationParser::renderTemplate('users.{id}.name', ['id' => '42']);
// 'users.42.name'
```

---

## Exceptions

| Exception                      | When                                                                                                                     |
| ------------------------------ | ------------------------------------------------------------------------------------------------------------------------ |
| `AccessorException`            | Base exception class                                                                                                     |
| `InvalidFormatException`       | Invalid input format (e.g., malformed JSON, missing parser plugin at accessor level)                                     |
| `UnsupportedTypeException`     | `detect()` cannot determine format; `PluginRegistry` has no registered plugin; `toXml()`/`transform()` has no serializer |
| `PathNotFoundException`        | Reserved (not thrown by `get()`)                                                                                         |
| `SecurityException`            | SSRF attempt, path traversal, payload too large, forbidden keys, CSV injection (`error` mode)                            |
| `ReadonlyViolationException`   | Modifying a readonly accessor (`set`, `remove`, `merge`, `push`, etc.)                                                   |
| `SchemaValidationException`    | Schema validation failed — has `getIssues(): SchemaValidationIssue[]` for detailed error info                            |
| `JsonPatchTestFailedException` | JSON Patch `test` operation failed — value at path does not match expected value                                         |

---

## Interfaces

| Interface                   | Methods                                                                                                       |
| --------------------------- | ------------------------------------------------------------------------------------------------------------- |
| `ReadableInterface`         | `get()`, `getMany()`, `all()`                                                                                 |
| `WritableInterface`         | `set()`, `merge()`, `remove()`                                                                                |
| `TransformableInterface`    | `toArray()`, `toJson()`, `toXml()`, `toYaml()`, `toToml()`, `toNdjson()`, `toObject()`, `transform()`         |
| `AccessorInterface`         | Extends `ReadableInterface` + `TransformableInterface`, adds `from()`, `has()`, `type()`, `count()`, `keys()` |
| `ParserPluginInterface`     | `parse()`                                                                                                     |
| `SerializerPluginInterface` | `serialize()`                                                                                                 |
| `SchemaAdapterInterface`    | `validate()`                                                                                                  |

---

## Enums

### `Format`

**Namespace:** `SafeAccessInline\Enums\Format`

String-backed enum covering all built-in formats. Use it as a type-safe alternative to passing raw strings to `SafeAccess::from()`.

| Case             | Value      |
| ---------------- | ---------- |
| `Format::Array`  | `'array'`  |
| `Format::Object` | `'object'` |
| `Format::Json`   | `'json'`   |
| `Format::Xml`    | `'xml'`    |
| `Format::Yaml`   | `'yaml'`   |
| `Format::Toml`   | `'toml'`   |
| `Format::Ini`    | `'ini'`    |
| `Format::Csv`    | `'csv'`    |
| `Format::Env`    | `'env'`    |
| `Format::Ndjson` | `'ndjson'` |

### `AuditEventType`

**Namespace:** `SafeAccessInline\Enums\AuditEventType`

Identifies the category of an emitted audit event.

| Case                                   | Value                    |
| -------------------------------------- | ------------------------ |
| `AuditEventType::FILE_READ`            | `'file.read'`            |
| `AuditEventType::FILE_WATCH`           | `'file.watch'`           |
| `AuditEventType::URL_FETCH`            | `'url.fetch'`            |
| `AuditEventType::SECURITY_VIOLATION`   | `'security.violation'`   |
| `AuditEventType::SECURITY_DEPRECATION` | `'security.deprecation'` |
| `AuditEventType::DATA_MASK`            | `'data.mask'`            |
| `AuditEventType::DATA_FREEZE`          | `'data.freeze'`          |
| `AuditEventType::DATA_FORMAT_WARNING`  | `'data.format_warning'`  |
| `AuditEventType::SCHEMA_VALIDATE`      | `'schema.validate'`      |
| `AuditEventType::PLUGIN_OVERWRITE`     | `'plugin.overwrite'`     |

### `SegmentType`

**Namespace:** `SafeAccessInline\Enums\SegmentType`

Discriminator for the parsed segment kinds produced by the dot-notation parser.

| Case                         | Value             |
| ---------------------------- | ----------------- |
| `SegmentType::KEY`           | `'key'`           |
| `SegmentType::INDEX`         | `'index'`         |
| `SegmentType::WILDCARD`      | `'wildcard'`      |
| `SegmentType::DESCENT`       | `'descent'`       |
| `SegmentType::DESCENT_MULTI` | `'descent-multi'` |
| `SegmentType::MULTI_INDEX`   | `'multi-index'`   |
| `SegmentType::MULTI_KEY`     | `'multi-key'`     |
| `SegmentType::FILTER`        | `'filter'`        |
| `SegmentType::SLICE`         | `'slice'`         |

### `PatchOperationType`

**Namespace:** `SafeAccessInline\Enums\PatchOperationType`

String-backed enum mirroring the RFC 6902 JSON Patch operation names.

| Case                          | Value       |
| ----------------------------- | ----------- |
| `PatchOperationType::ADD`     | `'add'`     |
| `PatchOperationType::REMOVE`  | `'remove'`  |
| `PatchOperationType::REPLACE` | `'replace'` |
| `PatchOperationType::MOVE`    | `'move'`    |
| `PatchOperationType::COPY`    | `'copy'`    |
| `PatchOperationType::TEST`    | `'test'`    |

### `CsvMode`

**Namespace:** `SafeAccessInline\Enums\CsvMode`

Controls CSV injection sanitization applied during `toCsv()` serialization and when reading through a `SecurityPolicy`. Targets cells whose first character is `=`, `+`, `-`, or `@`.

| Case              | Value      | Behavior                                    |
| ----------------- | ---------- | ------------------------------------------- |
| `CsvMode::NONE`   | `'none'`   | No sanitization (default)                   |
| `CsvMode::PREFIX` | `'prefix'` | Prepends a tab character to dangerous cells |
| `CsvMode::STRIP`  | `'strip'`  | Removes the dangerous leading character     |
| `CsvMode::ERROR`  | `'error'`  | Throws `SecurityException` on detection     |

```php
use SafeAccessInline\Enums\CsvMode;
use SafeAccessInline\Security\Guards\SecurityPolicy;

// Via toCsv() directly
$accessor->toCsv(CsvMode::STRIP->value); // or plain string 'strip'

// Via SecurityPolicy
$policy = new SecurityPolicy(csvMode: CsvMode::STRIP->value);
$accessor = SafeAccess::withPolicy($csvString, $policy);
```

### `FileLoadOptions`

**Namespace:** `SafeAccessInline\Contracts\FileLoadOptions`

A readonly DTO that encapsulates file-loading options. Accepted by `fromFile()`, `layerFiles()`, and `watchFile()` as an alternative to positional arguments.

| Property        | Type      | Default | Description                                       |
| --------------- | --------- | ------- | ------------------------------------------------- |
| `$format`       | `?string` | `null`  | Force a specific format; overrides auto-detection |
| `$allowedDirs`  | `array`   | `[]`    | Directory allowlist for path-traversal protection |
| `$allowAnyPath` | `bool`    | `false` | Bypass directory restrictions (use with caution)  |

```php
use SafeAccessInline\Contracts\FileLoadOptions;
use SafeAccessInline\SafeAccess;

$opts = new FileLoadOptions(format: 'json', allowedDirs: ['/app/config']);
$accessor = SafeAccess::fromFile('/app/config/app.json', $opts);
```
