# API Reference — PHP

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

Creates an accessor from a YAML string. Requires `symfony/yaml` or `ext-yaml`.

```php
$accessor = SafeAccess::fromYaml("name: Ana\nage: 30");
```

#### `SafeAccess::fromToml(string $data): TomlAccessor`

Creates an accessor from a TOML string. Requires `devium/toml`.

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
$accessor->get('user.name');           // value or null
$accessor->get('user.email', 'N/A');   // value or 'N/A'
$accessor->get('users.*.name');        // array of values (wildcard)
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

Returns all data as an associative array.

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

#### `remove(string $path): static`

Returns a **new instance** with the given path removed.

```php
$new = $accessor->remove('user.age');
// $accessor is unchanged, $new has 'age' removed
```

### Transformation

#### `toArray(): array`

Convert data to a PHP array.

#### `toJson(int $flags = 0): string`

Convert data to a JSON string.

```php
$accessor->toJson();                    // compact
$accessor->toJson(JSON_PRETTY_PRINT);   // pretty-printed
```

#### `toObject(): stdClass`

Convert data to a stdClass object.

#### `toXml(string $rootElement = 'root'): string`

Convert data to an XML string.

```php
$accessor->toXml();           // <root>...</root>
$accessor->toXml('config');   // <config>...</config>
```

#### `toYaml(): string`

Convert data to a YAML string. Requires `symfony/yaml`.

---

## DotNotationParser

**Namespace:** `SafeAccessInline\Core\DotNotationParser`

Static utility class. Typically used internally, but available for direct use.

#### `DotNotationParser::get(array $data, string $path, mixed $default = null): mixed`

#### `DotNotationParser::has(array $data, string $path): bool`

#### `DotNotationParser::set(array $data, string $path, mixed $value): array`

Returns a new array (does not mutate input).

#### `DotNotationParser::remove(array $data, string $path): array`

Returns a new array (does not mutate input).

---

## Exceptions

| Exception | When |
|-----------|------|
| `AccessorException` | Base exception class |
| `InvalidFormatException` | Invalid input format (e.g., malformed JSON) |
| `UnsupportedTypeException` | `detect()` cannot determine format |
| `PathNotFoundException` | Reserved (not thrown by `get()`) |

---

## Interfaces

| Interface | Methods |
|-----------|---------|
| `ReadableInterface` | `get()`, `getMany()`, `all()` |
| `WritableInterface` | `set()`, `remove()` |
| `TransformableInterface` | `toArray()`, `toJson()`, `toXml()`, `toYaml()`, `toObject()` |
| `AccessorInterface` | Extends `ReadableInterface` + `TransformableInterface`, adds `from()`, `has()`, `type()`, `count()`, `keys()` |
