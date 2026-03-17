---
outline: deep
---

# API — Types & Internals — PHP

## Table of Contents

- [PluginRegistry](#pluginregistry)
- [DotNotationParser](#dotnotationparser)
- [Exceptions](#exceptions)
- [Interfaces](#interfaces)
- [Enums](#enums)

## PluginRegistry

**Namespace:** `SafeAccessInline\Core\PluginRegistry`

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

## DotNotationParser

**Namespace:** `SafeAccessInline\Core\DotNotationParser`

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

### `AccessorFormat`

**Namespace:** `SafeAccessInline\Enums\AccessorFormat`

String-backed enum covering all built-in formats. Use it as a type-safe alternative to passing raw strings to `SafeAccess::from()`.

| Case                     | Value      |
| ------------------------ | ---------- |
| `AccessorFormat::Array`  | `'array'`  |
| `AccessorFormat::Object` | `'object'` |
| `AccessorFormat::Json`   | `'json'`   |
| `AccessorFormat::Xml`    | `'xml'`    |
| `AccessorFormat::Yaml`   | `'yaml'`   |
| `AccessorFormat::Toml`   | `'toml'`   |
| `AccessorFormat::Ini`    | `'ini'`    |
| `AccessorFormat::Csv`    | `'csv'`    |
| `AccessorFormat::Env`    | `'env'`    |
| `AccessorFormat::Ndjson` | `'ndjson'` |
