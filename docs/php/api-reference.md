---
title: API Reference
parent: PHP
nav_order: 2
permalink: /php/api-reference/
---

# API Reference — PHP

## Table of Contents

- [SafeAccess Facade](#safeaccess-facade)
- [Accessor Instance Methods](#accessor-instance-methods)
- [PluginRegistry](#pluginregistry)
- [DotNotationParser](#dotnotationparser)
- [Exceptions](#exceptions)
- [Interfaces](#interfaces)
- [Enums](#enums)

## SafeAccess Facade

**Namespace:** `SafeAccessInline\SafeAccess`

### Factory Methods

#### `SafeAccess::fromArray(array $data): ArrayAccessor`

Creates an accessor from a PHP array.

```php
$accessor = SafeAccess::fromArray(['name' => 'Ana', 'age' => 30]);
```

#### `SafeAccess::fromObject(object $data): ObjectAccessor`

Creates an accessor from a PHP object (stdClass or any object).

```php
$accessor = SafeAccess::fromObject((object) ['name' => 'Ana']);
```

#### `SafeAccess::fromJson(string $data): JsonAccessor`

Creates an accessor from a JSON string.

```php
$accessor = SafeAccess::fromJson('{"name": "Ana"}');
```

#### `SafeAccess::fromXml(string|SimpleXMLElement $data): XmlAccessor`

Creates an accessor from an XML string or SimpleXMLElement.

```php
$accessor = SafeAccess::fromXml('<root><name>Ana</name></root>');
```

#### `SafeAccess::fromYaml(string $data): YamlAccessor`

Creates an accessor from a YAML string. Uses `ext-yaml` (if available) or `symfony/yaml` by default. If a parser plugin is registered via `PluginRegistry`, the plugin takes precedence.

```php
$accessor = SafeAccess::fromYaml("name: Ana\nage: 30");
```

#### `SafeAccess::fromToml(string $data): TomlAccessor`

Creates an accessor from a TOML string. Uses `devium/toml` by default. If a parser plugin is registered via `PluginRegistry`, the plugin takes precedence.

```php
$accessor = SafeAccess::fromToml('name = "Ana"');
```

#### `SafeAccess::fromIni(string $data): IniAccessor`

Creates an accessor from an INI string.

```php
$accessor = SafeAccess::fromIni("[section]\nkey = value");
```

#### `SafeAccess::fromCsv(string $data): CsvAccessor`

Creates an accessor from a CSV string (first line = headers).

```php
$accessor = SafeAccess::fromCsv("name,age\nAna,30");
```

#### `SafeAccess::fromEnv(string $data): EnvAccessor`

Creates an accessor from a `.env` format string.

```php
$accessor = SafeAccess::fromEnv("APP_NAME=MyApp\nDEBUG=true");
```

#### `SafeAccess::from(mixed $data, string|AccessorFormat $format = ''): AbstractAccessor`

Unified factory — creates an accessor from any data. With a format string or `AccessorFormat` enum value, delegates to the corresponding typed factory. Without a format, auto-detects (same as `detect()`).

Supported formats: `'array'`, `'object'`, `'json'`, `'xml'`, `'yaml'`, `'toml'`, `'ini'`, `'csv'`, `'env'`, or any custom name registered via `extend()`. All built-in formats are also available as `AccessorFormat` enum cases.

```php
use SafeAccessInline\Enums\AccessorFormat;

// Auto-detect (no format)
$accessor = SafeAccess::from('{"name": "Ana"}'); // JsonAccessor

// Explicit format via string
$json = SafeAccess::from('{"name": "Ana"}', 'json');   // JsonAccessor
$yaml = SafeAccess::from("name: Ana", 'yaml');          // YamlAccessor

// Explicit format via enum
$json = SafeAccess::from('{"name": "Ana"}', AccessorFormat::Json);    // JsonAccessor
$yaml = SafeAccess::from("name: Ana", AccessorFormat::Yaml);           // YamlAccessor
$xml  = SafeAccess::from('<root><n>1</n></root>', AccessorFormat::Xml); // XmlAccessor
$arr  = SafeAccess::from(['a' => 1], AccessorFormat::Array);            // ArrayAccessor

// Custom format (string only)
SafeAccess::extend('custom', MyAccessor::class);
$custom = SafeAccess::from($data, 'custom');
```

Throws `InvalidFormatException` if the format is unknown and not registered.

#### `SafeAccess::detect(mixed $data): AbstractAccessor`

Auto-detects the format and creates the appropriate accessor.

Detection priority: array → SimpleXMLElement → object → JSON string → XML string → INI string → ENV string.

```php
$accessor = SafeAccess::detect(['key' => 'value']); // ArrayAccessor
```

#### `SafeAccess::extend(string $name, string $class): void`

Registers a custom accessor class.

```php
SafeAccess::extend('custom', MyAccessor::class);
```

#### `SafeAccess::custom(string $name, mixed $data): AbstractAccessor`

Instantiates a previously registered custom accessor.

```php
$accessor = SafeAccess::custom('custom', $data);
```

---

## Accessor Instance Methods

All accessors extend `AbstractAccessor` and implement these methods:

### Reading

#### `get(string $path, mixed $default = null): mixed`

Access a value via dot notation path. **Never throws** — returns `$default` if path not found.

```php
$accessor->get('user.name');                          // value or null
$accessor->get('user.email', 'N/A');                  // value or 'N/A'
$accessor->get('users.*.name');                       // array of values (wildcard)
$accessor->get("users[?role=='admin'].name");         // filtered values
$accessor->get('..name');                             // recursive descent
```

#### `getMany(array $paths): array`

Get multiple values at once. Keys are paths, values are defaults.

```php
$accessor->getMany([
    'user.name' => 'Unknown',
    'user.email' => 'N/A',
]);
// ['user.name' => 'Ana', 'user.email' => 'N/A']
```

#### `has(string $path): bool`

Check if a path exists in the data.

```php
$accessor->has('user.name');    // true
$accessor->has('missing');      // false
```

#### `type(string $path): ?string`

Returns the PHP type of the value at the given path, or `null` if path doesn't exist.

```php
$accessor->type('name');   // "string"
$accessor->type('age');    // "integer"
$accessor->type('tags');   // "array"
$accessor->type('x');      // null
```

#### `count(?string $path = null): int`

Count elements at path (or root).

```php
$accessor->count();          // root element count
$accessor->count('items');   // count of 'items' array
```

#### `keys(?string $path = null): array`

List keys at path (or root).

```php
$accessor->keys();           // ['name', 'age', 'items']
$accessor->keys('items');    // [0, 1, 2]
```

#### `all(): array`

Returns all data as an associative array. Semantic intent: "give me everything as-is".

```php
$accessor->all(); // ['name' => 'Ana', 'age' => 30, ...]
```

### Writing (Immutable)

#### `set(string $path, mixed $value): static`

Returns a **new instance** with the value set at the given path.

```php
$new = $accessor->set('user.email', 'ana@example.com');
// $accessor is unchanged, $new has the value
```

#### `merge(array $value): static`

#### `merge(string $path, array $value): static`

Deep merges data at root or at a specific path. Returns a **new instance**. Associative arrays are merged recursively; other values are replaced.

```php
// Merge at root
$merged = $accessor->merge(['theme' => 'dark', 'notifications' => true]);

// Merge at path
$merged = $accessor->merge('user.settings', ['theme' => 'dark']);
```

#### `remove(string $path): static`

Returns a **new instance** with the given path removed.

```php
$new = $accessor->remove('user.age');
// $accessor is unchanged, $new has 'age' removed
```

### Transformation

#### `toArray(): array`

Convert data to a PHP array. Semantic intent: "convert to array format". Currently identical to `all()`, but semantically distinct for future extensibility.

#### `toJson(int $flags = 0): string`

Convert data to a JSON string.

```php
$accessor->toJson();                    // compact
$accessor->toJson(JSON_PRETTY_PRINT);   // pretty-printed
```

#### `toObject(): stdClass`

Convert data to a stdClass object.

#### `toXml(string $rootElement = 'root'): string`

Convert data to an XML string. Checks `PluginRegistry` for an XML serializer first; falls back to built-in `SimpleXMLElement` implementation.

```php
$accessor->toXml();           // <root>...</root>
$accessor->toXml('config');   // <config>...</config>
```

#### `toYaml(): string`

Convert data to a YAML string. Checks `PluginRegistry` for a YAML serializer first; then falls back to `yaml_emit()` if `ext-yaml` is available; otherwise uses `Symfony\Component\Yaml\Yaml::dump()`.

```php
$accessor = SafeAccess::fromJson('{"name": "Ana"}');
$accessor->toYaml();          // "name: Ana\n"
```

#### `toToml(): string`

Convert data to a TOML string. Checks `PluginRegistry` for a TOML serializer first; falls back to `Devium\Toml\Toml::encode()`.

```php
$accessor = SafeAccess::fromJson('{"name": "Ana"}');
$accessor->toToml();          // 'name = "Ana"'
```

#### `transform(string $format): string`

Serialize data to any format that has a registered serializer plugin. Throws `UnsupportedTypeException` if no serializer is registered for the given format.

```php
PluginRegistry::registerSerializer('yaml', new SymfonyYamlSerializer());
$accessor->transform('yaml');  // "name: Ana\nage: 30\n"
```

---

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

---

## Exceptions

| Exception                  | When                                                                                                                     |
| -------------------------- | ------------------------------------------------------------------------------------------------------------------------ |
| `AccessorException`        | Base exception class                                                                                                     |
| `InvalidFormatException`   | Invalid input format (e.g., malformed JSON, missing parser plugin at accessor level)                                     |
| `UnsupportedTypeException` | `detect()` cannot determine format; `PluginRegistry` has no registered plugin; `toXml()`/`transform()` has no serializer |
| `PathNotFoundException`    | Reserved (not thrown by `get()`)                                                                                         |

---

## Interfaces

| Interface                   | Methods                                                                                                       |
| --------------------------- | ------------------------------------------------------------------------------------------------------------- |
| `ReadableInterface`         | `get()`, `getMany()`, `all()`                                                                                 |
| `WritableInterface`         | `set()`, `merge()`, `remove()`                                                                                |
| `TransformableInterface`    | `toArray()`, `toJson()`, `toXml()`, `toYaml()`, `toToml()`, `toObject()`, `transform()`                       |
| `AccessorInterface`         | Extends `ReadableInterface` + `TransformableInterface`, adds `from()`, `has()`, `type()`, `count()`, `keys()` |
| `ParserPluginInterface`     | `parse()`                                                                                                     |
| `SerializerPluginInterface` | `serialize()`                                                                                                 |

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
